# 构建安卓 APK（不依赖 Gradle，直接用 Android SDK 工具链）
# 需要：JAVA_HOME 指向 JDK 17+，ANDROID_SDK_ROOT 指向 Android SDK
#
# 注意：aapt2 无法处理含中文的路径，所以先把工程复制到
# 临时英文目录再构建，最后把 APK 拷回项目目录。

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path     # android/
$proj = Split-Path -Parent $root                            # 项目根

$SDK = if ($env:ANDROID_SDK_ROOT) { $env:ANDROID_SDK_ROOT } elseif ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { throw '未设置 ANDROID_SDK_ROOT' }
$JDK = if ($env:JAVA_HOME) { $env:JAVA_HOME } else { throw '未设置 JAVA_HOME' }

$BT = Join-Path $SDK 'build-tools\34.0.0'
$AJAR = Join-Path $SDK 'platforms\android-34\android.jar'
foreach ($p in @($BT, $AJAR, $JDK)) { if (-not (Test-Path $p)) { throw "缺少构建组件: $p" } }

$aapt2     = Join-Path $BT 'aapt2.exe'
$d8        = Join-Path $BT 'd8.bat'
$zipalign  = Join-Path $BT 'zipalign.exe'
$apksigner = Join-Path $BT 'apksigner.bat'
$javac     = Join-Path $JDK 'bin\javac.exe'
$keytool   = Join-Path $JDK 'bin\keytool.exe'

Write-Host '[0/8] 生成单文件页面'
Push-Location $proj
try { & node (Join-Path $proj 'make-app-html.mjs') } finally { Pop-Location }

# 准备英文工作目录
$work = Join-Path $env:TEMP 'wushu-apk-build'
if (Test-Path $work) { Remove-Item $work -Recurse -Force }
New-Item -ItemType Directory -Force -Path $work | Out-Null

Write-Host '[1/8] 复制工程到英文路径'
foreach ($item in @('AndroidManifest.xml', 'res', 'java', 'assets')) {
  Copy-Item (Join-Path $root $item) -Destination $work -Recurse -Force
}
New-Item -ItemType Directory -Force -Path (Join-Path $work 'gen'), (Join-Path $work 'classes'), (Join-Path $work 'dex') | Out-Null

Write-Host '[2/8] 编译资源'
& $aapt2 compile --dir (Join-Path $work 'res') -o (Join-Path $work 'res.zip')
if ($LASTEXITCODE -ne 0) { throw 'aapt2 compile 失败' }

Write-Host '[3/8] 链接资源与清单'
& $aapt2 link -o (Join-Path $work 'base.apk') `
  -I $AJAR `
  --manifest (Join-Path $work 'AndroidManifest.xml') `
  -R (Join-Path $work 'res.zip') `
  --java (Join-Path $work 'gen') `
  -A (Join-Path $work 'assets') `
  --min-sdk-version 21 --target-sdk-version 34 --auto-add-overlay
if ($LASTEXITCODE -ne 0) { throw 'aapt2 link 失败' }

Write-Host '[4/8] 编译 Java'
$sources = @()
$sources += Get-ChildItem (Join-Path $work 'gen') -Recurse -Filter '*.java' | ForEach-Object { $_.FullName }
$sources += Get-ChildItem (Join-Path $work 'java') -Recurse -Filter '*.java' | ForEach-Object { $_.FullName }
& $javac -encoding UTF-8 -source 11 -target 11 -nowarn -classpath $AJAR -d (Join-Path $work 'classes') @sources
if ($LASTEXITCODE -ne 0) { throw 'javac 失败' }

Write-Host '[5/8] 转成 dex'
& $d8 --lib $AJAR --min-api 21 --output (Join-Path $work 'dex') (Get-ChildItem (Join-Path $work 'classes') -Recurse -Filter '*.class' | ForEach-Object { $_.FullName })
if ($LASTEXITCODE -ne 0) { throw 'd8 失败' }

Write-Host '[6/8] 合成 APK'
$python = if (Get-Command python -ErrorAction SilentlyContinue) { 'python' } else { 'C:\Users\yangs\python\python.exe' }
& $python (Join-Path $root 'pack-apk.py') (Join-Path $work 'base.apk') (Join-Path $work 'dex\classes.dex') (Join-Path $work 'unaligned.apk')
if ($LASTEXITCODE -ne 0) { throw '合成 APK 失败' }

Write-Host '[7/8] 对齐'
& $zipalign -f -p 4 (Join-Path $work 'unaligned.apk') (Join-Path $work 'aligned.apk')
if ($LASTEXITCODE -ne 0) { throw 'zipalign 失败' }

Write-Host '[8/8] 签名'
$ks = Join-Path $root 'wushu.keystore'
if (-not (Test-Path $ks)) {
  & $keytool -genkeypair -keystore $ks -alias wushu -storepass wushu123 -keypass wushu123 `
    -keyalg RSA -keysize 2048 -validity 10000 -dname 'CN=WuShu, OU=Trad, O=Trad, L=CN, C=CN'
  if ($LASTEXITCODE -ne 0) { throw 'keytool 失败' }
}
$final = Join-Path $work 'wushu.apk'
& $apksigner sign --ks $ks --ks-pass pass:wushu123 --key-pass pass:wushu123 --out $final (Join-Path $work 'aligned.apk')
if ($LASTEXITCODE -ne 0) { throw 'apksigner 失败' }

& $apksigner verify --print-certs $final | Select-Object -First 3

$out = Join-Path $proj '五术排盘.apk'
Copy-Item $final $out -Force
$mb = [math]::Round((Get-Item $out).Length / 1MB, 2)
Write-Host ''
Write-Host "打包完成: $out  ($mb MB)"