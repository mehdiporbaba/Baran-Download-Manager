using System;
using System.Drawing;
using System.IO;
using Baran;

class WindowFixture {
  static void Assert(bool value, string message) { if (!value) throw new Exception(message); }
  static int Main(string[] args) {
    try {
      string root = args[0]; Directory.CreateDirectory(root);
      var placement = new WindowPlacement(root); Assert(placement.NormalBounds.IsEmpty, "Default placement");
      var requested = new Rectangle(-1500, 90, 880, 560); placement.Save(requested, false);
      var restored = new WindowPlacement(root);
      Assert(restored.NormalBounds == requested && !restored.Maximized, "Remember user normal bounds");
      Assert(WindowPlacement.Fit(restored.NormalBounds, new Rectangle(-1920, 0, 1920, 1080)) == requested, "Preserve valid secondary-monitor bounds");
      placement.Save(requested, true); Assert(new WindowPlacement(root).Maximized, "Remember maximize while retaining restore bounds");
      foreach (var area in new [] { new Rectangle(0,0,640,480), new Rectangle(1920,-1080,1920,1080), new Rectangle(0,0,1,1) }) {
        Assert(area.Contains(WindowPlacement.Fit(requested, area)), "Disconnected/resized monitor stays reachable");
        Assert(area.Contains(WindowPlacement.Fit(Rectangle.Empty, area)), "Default fits current work area");
      }
      File.WriteAllText(Path.Combine(root,"window-placement.json"), "invalid json"); Assert(new WindowPlacement(root).NormalBounds.IsEmpty, "Damaged placement falls back");
      var size = new Size(900,600);
      var points = new [] {new Point(0,0),new Point(899,0),new Point(0,599),new Point(899,599),new Point(0,100),new Point(899,100),new Point(100,0),new Point(100,599),new Point(100,100),new Point(-1,-1)};
      var expected = new [] {13,14,16,17,10,11,12,15,1,1};
      for (int i=0;i<points.Length;i++) { Assert(WindowFrame.HitTest(points[i],size,false)==expected[i],"Resize corner/edge routing"); Assert(WindowFrame.HitTest(points[i],size,true)==1,"Maximized edges do not resize"); }
      foreach (string theme in new [] {"light","dark"}) Console.WriteLine(J.Encode(J.Obj("theme",theme,"script",ViewStartup.Script(J.Obj("theme",theme,"language","fa")),"background",ColorTranslator.ToHtml(ViewStartup.Background(J.Obj("theme",theme))))));
      Console.WriteLine("PASS window placement: durable normal/maximized bounds, missing monitors, corrupt state and all resize edges"); return 0;
    } catch (Exception e) { Console.Error.WriteLine(e); return 1; }
  }
}
