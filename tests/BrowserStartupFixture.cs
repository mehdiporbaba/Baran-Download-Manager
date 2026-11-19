using System;
using System.IO;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Threading;

class BrowserStartupFixture {
  [StructLayout(LayoutKind.Sequential)] struct Basic { public long time1,time2; public uint flags; public UIntPtr min,max; public uint active; public UIntPtr affinity; public uint priority,scheduling; }
  [StructLayout(LayoutKind.Sequential)] struct Io { public ulong a,b,c,d,e,f; }
  [StructLayout(LayoutKind.Sequential)] struct Limits { public Basic basic; public Io io; public UIntPtr processMemory,jobMemory,peakProcess,peakJob; }
  [DllImport("kernel32.dll",CharSet=CharSet.Unicode)] static extern IntPtr CreateJobObject(IntPtr security,string name);
  [DllImport("kernel32.dll")] static extern bool SetInformationJobObject(IntPtr job,int kind,ref Limits limits,int length);
  [DllImport("kernel32.dll")] static extern bool AssignProcessToJobObject(IntPtr job,IntPtr process);
  [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr handle);
  [DllImport("kernel32.dll")] static extern bool TerminateJobObject(IntPtr job,uint code);
  static void Check(bool value,string message) { if(!value) throw new Exception(message); }
  public static int Main(string[] args) {
    if(args[0]=="child") { File.WriteAllText(args[1],Process.GetCurrentProcess().Id.ToString()); Thread.Sleep(30000); return 0; }
    if(args[0]=="host") {
      while(!File.Exists(args[2])) Thread.Sleep(20);
      string exe=Process.GetCurrentProcess().MainModule.FileName;
      string command="child \""+args[1]+"\"";
      if(args[3]=="detached") NativeHost.StartDetached(exe,command);
      else Process.Start(new ProcessStartInfo(exe,command) { UseShellExecute=false,CreateNoWindow=true });
      Thread.Sleep(30000); return 0;
    }
    foreach(string mode in new[]{"ordinary","detached"}) {
      string path=Path.Combine(args[1],mode), gate=path+".go";
      IntPtr job=CreateJobObject(IntPtr.Zero,null); Process host=null,child=null;
      try {
        var limits=new Limits(); limits.basic.flags=0x2000|0x800; // kill-on-close, explicit breakaway allowed
        Check(SetInformationJobObject(job,9,ref limits,Marshal.SizeOf(limits)),"set job");
        host=Process.Start(new ProcessStartInfo(Process.GetCurrentProcess().MainModule.FileName,"host \""+path+"\" \""+gate+"\" "+mode) { UseShellExecute=false,CreateNoWindow=true });
        Check(AssignProcessToJobObject(job,host.Handle),"assign browser host job"); File.WriteAllText(gate,"");
        for(int n=0;n<250 && !File.Exists(path);n++) Thread.Sleep(20);
        Check(File.Exists(path),"child startup "+mode); child=Process.GetProcessById(Int32.Parse(File.ReadAllText(path)));
        CloseHandle(job); job=IntPtr.Zero; Check(host.WaitForExit(5000),"host terminated");
        bool died=child.WaitForExit(1000);
        Check(mode=="ordinary" ? died : !died,"child lifetime "+mode);
        Console.WriteLine("PASS browser job: "+mode+" child "+(died?"terminated (bug reproduced)":"survives host cleanup"));
      } finally { if(job!=IntPtr.Zero) { TerminateJobObject(job,1); CloseHandle(job); } if(child!=null) { if(!child.HasExited) child.Kill(); child.Dispose(); } if(host!=null) host.Dispose(); }
    }
    return 0;
  }
}
