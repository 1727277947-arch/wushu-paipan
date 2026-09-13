"""把 classes.dex 塞进 aapt2 生成的 APK，产出未对齐的 APK。"""
import sys, zipfile, shutil, os

base_apk, dex_path, out_apk = sys.argv[1], sys.argv[2], sys.argv[3]
shutil.copyfile(base_apk, out_apk)

# 压缩级别 0 存 dex 之外的条目，dex 用 deflate
with zipfile.ZipFile(out_apk, "a", zipfile.ZIP_DEFLATED) as z:
    if "classes.dex" in z.namelist():
        raise SystemExit("APK 里已存在 classes.dex")
    z.write(dex_path, "classes.dex")

size = os.path.getsize(out_apk)
with zipfile.ZipFile(out_apk) as z:
    names = z.namelist()
print(f"合成完毕: {out_apk}  {size/1024:.0f} KB  条目 {len(names)} 个")