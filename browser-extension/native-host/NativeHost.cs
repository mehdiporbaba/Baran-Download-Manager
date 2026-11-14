using System;
using System.IO;
using System.IO.Pipes;
using System.Text;
using System.Text.RegularExpressions;

// Chrome starts this small process. It forwards one bounded JSON message to the app.
public static class NativeHost {
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
                pipe.Connect(3000);
                WriteFrame(pipe, request);
                WriteFrame(output, ReadFrame(pipe));
            }
        } catch {
            WriteFrame(output, Encoding.UTF8.GetBytes("{\"ok\":false,\"error\":\"Open Baran and try again.\"}"));
        }
    }
}
