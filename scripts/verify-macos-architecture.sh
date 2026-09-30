#!/bin/bash
set -euo pipefail

app_path="${1:?需要提供 .app 路径}"
target="${2:?需要提供 Rust target}"
case "$target" in
  aarch64-apple-darwin) expected_arch=arm64 ;;
  x86_64-apple-darwin) expected_arch=x86_64 ;;
  *) echo "不支持的目标：$target" >&2; exit 1 ;;
esac

executable=$(/usr/libexec/PlistBuddy -c 'Print :CFBundleExecutable' "$app_path/Contents/Info.plist")
main_binary="$app_path/Contents/MacOS/$executable"
[[ -f "$main_binary" ]] || { echo "找不到应用主程序：$main_binary" >&2; exit 1; }

verify_binary() {
  local binary="$1" description architectures
  description=$(file -b "$binary")
  [[ "$description" == *Mach-O* ]] || { echo "不是 Mach-O：$binary" >&2; return 1; }
  architectures=$(lipo -archs "$binary")
  [[ "$architectures" == "$expected_arch" ]] || {
    echo "架构不匹配：${binary}，期望 ${expected_arch}，实际 ${architectures}" >&2
    return 1
  }
  echo "架构校验通过：$binary ($architectures)"
}

verify_binary "$main_binary"
while IFS= read -r -d '' binary; do
  [[ "$binary" == "$main_binary" ]] && continue
  description=$(file -b "$binary")
  if [[ "$description" == *Mach-O* ]]; then
    verify_binary "$binary"
  fi
done < <(find "$app_path/Contents" -type f -print0)
