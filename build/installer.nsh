!macro customCheckAppRunning
  ; Update flow exits CamPlan before launching NSIS, so the installer must never try to close it again.
!macroend

!macro customCloseApp
  ; No-op: the app is already closed before the installer starts.
!macroend

!macro customInstallMode
  ; No-op: keep the default installation mode selection.
!macroend

!macro customUnInstallCheck
  ; No-op: the update flow already closes CamPlan before uninstalling the previous version.
!macroend

!macro customUnInstallCheckCurrentUser
  ; No-op: the update flow already closes CamPlan before uninstalling the previous version.
!macroend
