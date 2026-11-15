Unicode true
Name "Baran Download Manager"
OutFile "${OUTPUT}"
InstallDir "$LOCALAPPDATA\Programs\Baran Download Manager Native"
RequestExecutionLevel user
SetCompressor /SOLID lzma
!include "MUI2.nsh"
!define MUI_ABORTWARNING
!define MUI_WELCOMEPAGE_TEXT "Baran uses the shared Microsoft WebView2 Runtime and .NET Framework on Windows. It does not bundle Electron or a second Chromium runtime. If WebView2 is missing, install the Evergreen Runtime from Microsoft's official website. Optional media tools are separate downloads."
!define MUI_FINISHPAGE_RUN "$INSTDIR\Baran Download Manager.exe"
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "..\LICENSE"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "English"
Section "Baran Download Manager"
  SetOutPath "$INSTDIR"
  File /r "${APP_SOURCE}\*"
  WriteUninstaller "$INSTDIR\Uninstall.exe"
  CreateDirectory "$SMPROGRAMS\Baran Download Manager"
  CreateShortcut "$SMPROGRAMS\Baran Download Manager\Baran Download Manager.lnk" "$INSTDIR\Baran Download Manager.exe"
  CreateShortcut "$DESKTOP\Baran Download Manager.lnk" "$INSTDIR\Baran Download Manager.exe"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\BaranDownloadManagerNative" "DisplayName" "Baran Download Manager"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\BaranDownloadManagerNative" "DisplayVersion" "${APP_VERSION}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\BaranDownloadManagerNative" "Publisher" "Mehdi Porbaba"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\BaranDownloadManagerNative" "UninstallString" '"$INSTDIR\Uninstall.exe"'
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\BaranDownloadManagerNative" "InstallLocation" "$INSTDIR"
SectionEnd
Section "Uninstall"
  ExecWait '"$INSTDIR\Baran Download Manager.exe" --remove-wake-task'
  ReadRegStr $0 HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Baran Download Manager"
  StrCmp $0 '"$INSTDIR\Baran Download Manager.exe"' 0 +2
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Baran Download Manager"
  Delete "$DESKTOP\Baran Download Manager.lnk"
  Delete "$SMPROGRAMS\Baran Download Manager\Baran Download Manager.lnk"
  RMDir "$SMPROGRAMS\Baran Download Manager"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\BaranDownloadManagerNative"
  ; Only packaged application files are removed. Roaming\Baran user data stays.
  Delete "$INSTDIR\*.exe"
  Delete "$INSTDIR\*.dll"
  Delete "$INSTDIR\*.ico"
  Delete "$INSTDIR\bridge.js"
  Delete "$INSTDIR\mobile.html"
  Delete "$INSTDIR\runtime-components.json"
  RMDir /r "$INSTDIR\ui"
  RMDir /r "$INSTDIR\bin"
  RMDir /r "$INSTDIR\native-host"
  RMDir /r "$INSTDIR\licenses"
  RMDir "$INSTDIR"
SectionEnd
