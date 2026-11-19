using System;
using System.IO;
using System.IO.Pipes;
using System.Text;
using System.Text.RegularExpressions;
using System.Diagnostics;
using System.ComponentModel;
using System.Runtime.InteropServices;

// Chrome starts this small process. It forwards one bounded JSON message to the app.
public static class NativeHost {
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    struct StartupInfo { public int cb; public string reserved, desktop, title; public int x, y, width, height, charsX, charsY, fill, flags; public short show, reservedSize; public IntPtr reservedBytes, input, output, error; }
    [StructLayout(LayoutKind.Sequential)]
    struct ProcessInfo { public IntPtr process, thread; public int processId, threadId; }
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    static extern bool CreateProcess(string app, StringBuilder command, IntPtr processSecurity, IntPtr threadSecurity, bool inherit, uint flags, IntPtr environment, string directory, ref StartupInfo startup, out ProcessInfo process);
    [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr handle);
    // A browser owns its native host's job. Ordinary child processes die when
    // the one-shot host exits. Never launch the download manager in that job.
    public static int StartDetached(string application, string arguments) {
        var startup = new StartupInfo(); startup.cb = Marshal.SizeOf(startup);
        ProcessInfo process;
        if (!CreateProcess(application, new StringBuilder("\"" + application + "\" " + arguments), IntPtr.Zero, IntPtr.Zero, false,
            0x01000000 | 0x00000200 | 0x00000008, IntPtr.Zero, Path.GetDirectoryName(application), ref startup, out process))
            throw new Win32Exception(Marshal.GetLastWin32Error());
        try { return process.processId; } finally { CloseHandle(process.thread); CloseHandle(process.process); }
    }
    const int MaxMessage = 256 * 1024;
    static byte[] ReadExact(Stream stream, int count) {
        byte[] data = new byte[count];
        int offset = 0;
        while (offset < count) {
            int read = stream.Read(data, offset, count - offset);
            if (read == 0) throw new IOException("Connection closed");
            offset += read;
        }
        return data;
    }
    static byte[] ReadFrame(Stream stream) {
        int size = BitConverter.ToInt32(ReadExact(stream, 4), 0);
        if (size < 1 || size > MaxMessage) throw new IOException("Invalid message size");
        return ReadExact(stream, size);
    }
    static void WriteFrame(Stream stream, byte[] data) {
        byte[] header = BitConverter.GetBytes(data.Length);
        stream.Write(header, 0, 4);
        stream.Write(data, 0, data.Length);
        stream.Flush();
    }
    public static void Main() {
        Stream output = Console.OpenStandardOutput();
        try {
            byte[] request = ReadFrame(Console.OpenStandardInput());
            string user = Regex.Replace(Environment.UserName, "[^a-zA-Z0-9_-]", "_");
            string pipeName = "baran-download-manager-" + user;
            #if TEST
            pipeName = Environment.GetEnvironmentVariable("BARAN_NATIVE_TEST_PIPE") ?? pipeName;
            #endif
            using (var pipe = new NamedPipeClientStream(".", pipeName, PipeDirection.InOut)) {
                try { pipe.Connect(750); }
                catch (TimeoutException) {
                    #if !TEST
                    string configuration = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "baran-app-path.txt");
                    if (!File.Exists(configuration) || new FileInfo(configuration).Length > 8192) throw;
                    string application = File.ReadAllText(configuration, Encoding.UTF8).Trim();
                    if (!Path.IsPathRooted(application) || !Path.GetFileName(application).Equals("Baran Download Manager.exe", StringComparison.OrdinalIgnoreCase) || !File.Exists(application)) throw new IOException("Re-register Baran from Browser integration settings.");
                    StartDetached(application, "--browser-import");
                    pipe.Connect(7000);
                    #else
                    throw;
                    #endif
                }
                WriteFrame(pipe, request);
                WriteFrame(output, ReadFrame(pipe));
            }
        } catch {
            WriteFrame(output, Encoding.UTF8.GetBytes("{\"ok\":false,\"error\":\"Open Baran and try again.\"}"));
        }
    }
}
