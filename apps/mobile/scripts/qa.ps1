# apps/mobile/scripts/qa.ps1
# PowerShell 5.1 ADB QA Helper Functions for MUDRA Android App (§15)

$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
if ($env:Path -notlike "*platform-tools*") {
  $env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;$env:Path"
}

$QaDir = "D:\Hackathons\Nexconn\apps\mobile\qa"
if (-not (Test-Path $QaDir)) {
  New-Item -ItemType Directory -Force $QaDir | Out-Null
}

function Shot {
  param([Parameter(Mandatory=$true)][string]$Name)
  $OutPath = Join-Path $QaDir "$Name.png"
  adb shell screencap -p /sdcard/s.png
  adb pull /sdcard/s.png $OutPath | Out-Null
  Write-Host "Saved screenshot: $OutPath"
}

function Deep {
  param([Parameter(Mandatory=$true)][string]$Url)
  adb shell am start -W -a android.intent.action.VIEW -d "$Url" com.chanakya.mudra | Out-Null
  Start-Sleep -Seconds 2
}

function LaunchApp {
  adb shell monkey -p com.chanakya.mudra -c android.intent.category.LAUNCHER 1 | Out-Null
  Start-Sleep -Seconds 3
}

function Tap {
  param(
    [Parameter(Mandatory=$true)][int]$X,
    [Parameter(Mandatory=$true)][int]$Y
  )
  adb shell input tap $X $Y
  Start-Sleep -Milliseconds 600
}

function Swipe {
  param(
    [Parameter(Mandatory=$true)][int]$X1,
    [Parameter(Mandatory=$true)][int]$Y1,
    [Parameter(Mandatory=$true)][int]$X2,
    [Parameter(Mandatory=$true)][int]$Y2,
    [int]$Ms = 350
  )
  adb shell input swipe $X1 $Y1 $X2 $Y2 $Ms
  Start-Sleep -Milliseconds 600
}

function TypeText {
  param([Parameter(Mandatory=$true)][string]$Text)
  $Escaped = $Text -replace ' ', '%s'
  adb shell input text "$Escaped"
  Start-Sleep -Milliseconds 400
}

function Key {
  param([Parameter(Mandatory=$true)][string]$KeyCode)
  adb shell input keyevent $KeyCode
  Start-Sleep -Milliseconds 400
}

function Back {
  adb shell input keyevent KEYCODE_BACK
  Start-Sleep -Milliseconds 500
}

function ClearLogcat {
  adb logcat -c
}

function CheckCrashes {
  $Errors = adb logcat -d *:E | Select-String "com.chanakya.mudra|AndroidRuntime|FATAL EXCEPTION" -Context 0,5
  if ($Errors) {
    Write-Host "Potential errors found in logcat:" -ForegroundColor Yellow
    $Errors | ForEach-Object { Write-Host $_ }
  } else {
    Write-Host "No crashes found in logcat for com.chanakya.mudra." -ForegroundColor Green
  }
}
