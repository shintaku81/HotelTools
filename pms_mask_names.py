#!/usr/bin/env python3
"""
PMS画面の個人情報（ゲスト名・時刻）を黒塗りするスクリプト
Usage: python3 pms_mask_names.py <input_image> [output_image]

macOS Vision OCR（高精度）で日本語名・時刻を検出して黒塗り。
初回のみ: swiftc vision_ocr.swift -o /tmp/vision_ocr でコンパイル要
"""

import sys
import re
import json
import subprocess
import os
from pathlib import Path
from PIL import Image, ImageDraw

SCRIPT_DIR = Path(__file__).parent
SWIFT_SRC = SCRIPT_DIR / 'vision_ocr.swift'
VISION_BIN = Path('/tmp/vision_ocr')

def ensure_binary():
    """Swiftバイナリがなければコンパイルする"""
    if not VISION_BIN.exists() or VISION_BIN.stat().st_mtime < SWIFT_SRC.stat().st_mtime:
        print("Vision OCRバイナリをコンパイル中...")
        result = subprocess.run(
            ['swiftc', str(SWIFT_SRC), '-o', str(VISION_BIN)],
            capture_output=True, text=True
        )
        if result.returncode != 0:
            print(f"コンパイルエラー:\n{result.stderr}", file=sys.stderr)
            sys.exit(1)
        print("コンパイル完了")

def has_japanese(text):
    for ch in text:
        cp = ord(ch)
        if (0x4E00 <= cp <= 0x9FFF or   # 漢字
            0x3040 <= cp <= 0x309F or   # ひらがな
            0x30A0 <= cp <= 0x30FF):    # カタカナ
            return True
    return False

def is_time_pattern(text):
    t = text.strip()
    # HH:MM 形式
    if re.match(r'^\d{1,2}:\d{2}$', t):
        return True
    # HHMM 形式（コロン抜けのOCR誤読を補完）
    # 先頭2桁が有効な時間(00-23)なら時刻と判断（分は誤読を考慮して不問）
    m = re.match(r'^(\d{2})\d{2}$', t)
    if m:
        h = int(m.group(1))
        if 0 <= h <= 23:
            return True
    return False

# 部屋タイプコードで始まる宿泊プラン行（マスク不要）
_ROOM_CODE = re.compile(r'^[A-Z]{1,4}')
_PLAN_WORDS = {'早割', '朝食', '素泊', '食事', '連泊', '名', '泊り', '素泊り', '朝付'}

def is_room_plan(text):
    """「SW 朝食付1名」のような部屋プラン行か判定（個人情報ではない）"""
    t = text.strip()
    if not _ROOM_CODE.match(t):
        return False
    return any(w in t for w in _PLAN_WORDS)

def should_mask(text):
    t = text.strip()
    if not t:
        return False
    if is_time_pattern(t):
        return True
    if not has_japanese(t):
        return False
    if is_room_plan(t):
        return False    # 部屋プラン情報はマスク不要
    return True

def run_vision_ocr(image_path):
    """Vision OCRを実行してJSON結果を返す"""
    result = subprocess.run(
        [str(VISION_BIN), os.path.abspath(image_path)],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        print(f"OCRエラー: {result.stderr}", file=sys.stderr)
        return []
    return json.loads(result.stdout)

def tesseract_mask_regions(img, orig_w, orig_h, scale=2, pad=5):
    """Tesseractで追加の日本語テキストを検出（Vision OCRの補完）"""
    from PIL import ImageEnhance
    import pytesseract

    proc = img.resize((orig_w * scale, orig_h * scale), Image.LANCZOS)
    proc = ImageEnhance.Contrast(proc).enhance(1.8)
    proc = ImageEnhance.Sharpness(proc).enhance(2.5)

    regions = []
    for psm in (11, 6):
        data = pytesseract.image_to_data(
            proc, lang='jpn+eng',
            output_type=pytesseract.Output.DICT,
            config=f'--psm {psm}'
        )
        for i, text in enumerate(data['text']):
            if not should_mask(text.strip()):
                continue
            x = int(data['left'][i] / scale)
            y = int(data['top'][i] / scale)
            w = int(data['width'][i] / scale)
            h = int(data['height'][i] / scale)
            regions.append((x - pad, y - pad, x + w + pad, y + h + pad))

    print(f"  Tesseract全体: {len(regions)} 件")
    return regions


def strip_scan_regions(img, orig_w, orig_h, vision_obs, scale=4, pad=5):
    """
    Vision OCRが検出した部屋番号・日付・時刻から各セルの名前ゾーンを推定し、
    高解像度でOCRを実行して見落とした名前を補完。
    """
    from PIL import ImageEnhance
    import pytesseract

    # Vision OCRの全検出物を y でソート
    by_y = {}  # y_group -> list of obs
    for obs in vision_obs:
        # 同じ「行」に属するものをグループ化 (y を30px単位に丸める)
        g = (obs['y'] // 30) * 30
        by_y.setdefault(g, []).append(obs)

    regions = []
    scanned_cells = 0

    for g, obs_list in sorted(by_y.items()):
        # この行の時刻・部屋番号・日付の x 位置を取得
        times_x = [o['x'] for o in obs_list if is_time_pattern(o['text'])]
        room_nums = [o for o in obs_list if re.match(r'^[2-7]\d{2}$', o['text'].strip())]
        dates = [o for o in obs_list if re.match(r'^\d{1,2}/\d{1,2}$', o['text'].strip())]

        if not room_nums:
            continue

        # 各部屋の名前ゾーン候補を構築
        # 部屋番号の y+高さ～そのフロア行の名前位置 (room_y + 15 ～ room_y + 45)
        for rm in room_nums:
            rm_cx = rm['x'] + rm['w'] // 2
            rm_y  = rm['y']
            rm_h  = rm['h']

            # 名前は部屋番号と同じ行〜少し下に位置（rm_y + 8 〜 rm_y + 45）
            name_y0 = max(0, rm_y + 8)
            name_y1 = min(orig_h, rm_y + 48)

            # x範囲: 部屋番号の左端から前後に広めに取る
            name_x0 = max(0, rm['x'] - 90)
            name_x1 = min(orig_w, rm['x'] + 160)

            # このゾーンが既に Vision OCR で日本語名を検出済みかチェック
            # ※時刻は名前ではないので対象外
            already_masked = any(
                should_mask(o['text']) and has_japanese(o['text']) and
                abs((o['x'] + o['w']//2) - rm_cx) < 130 and
                abs((o['y'] + o['h']//2) - (name_y0 + 15)) < 25
                for o in obs_list
            )
            if already_masked:
                continue

            # 未検出の可能性があるセル → 高解像度OCR
            cell = img.crop((name_x0, name_y0, name_x1, name_y1))
            cw, ch = cell.size
            if cw < 20 or ch < 8:
                continue

            cell_proc = cell.resize((cw * scale, ch * scale), Image.LANCZOS)
            cell_proc = ImageEnhance.Contrast(cell_proc).enhance(2.5)
            cell_proc = ImageEnhance.Sharpness(cell_proc).enhance(3.0)

            for psm in (7, 8):
                data = pytesseract.image_to_data(
                    cell_proc, lang='jpn+eng',
                    output_type=pytesseract.Output.DICT,
                    config=f'--psm {psm} --oem 1'
                )
                for i, text in enumerate(data['text']):
                    t = text.strip()
                    if not should_mask(t):
                        continue
                    tx = name_x0 + int(data['left'][i] / scale)
                    ty = name_y0 + int(data['top'][i] / scale)
                    tw2 = int(data['width'][i] / scale)
                    th2 = int(data['height'][i] / scale)
                    regions.append((tx - pad, ty - pad, tx + tw2 + pad, ty + th2 + pad))
            scanned_cells += 1

    print(f"  セルスキャン: {len(regions)} 件 ({scanned_cells}セル対象)")
    return regions


def mask_names(input_path, output_path):
    ensure_binary()

    original = Image.open(input_path).convert('RGB')
    img_w, img_h = original.size
    print(f"画像サイズ: {img_w}x{img_h}")

    # Step 1: Vision OCR（高精度、メイン）
    print("Step 1: Vision OCR 実行中...")
    observations = run_vision_ocr(input_path)
    print(f"  検出テキスト数: {len(observations)} 件")

    draw = ImageDraw.Draw(original)
    pad = 6
    masked_count = 0

    for obs in observations:
        text = obs['text']
        if not should_mask(text):
            continue
        x, y, w, h = obs['x'], obs['y'], obs['w'], obs['h']
        draw.rectangle([x - pad, y - pad, x + w + pad, y + h + pad], fill='black')
        masked_count += 1

    # Step 2: Tesseract全体スキャン（Vision OCR誤読分を補足）
    print("Step 2: Tesseract 補完実行中...")
    orig_for_tess = Image.open(input_path).convert('RGB')
    tess_regions = tesseract_mask_regions(orig_for_tess, img_w, img_h)
    for region in tess_regions:
        draw.rectangle(region, fill='black')
    masked_count += len(tess_regions)

    # Step 3: フロア行ストリップの高解像度タイルスキャン（OCR見落とし補完）
    print("Step 3: フロア行ストリップスキャン中...")
    strip_regions = strip_scan_regions(orig_for_tess, img_w, img_h, observations)
    for region in strip_regions:
        draw.rectangle(region, fill='black')
    masked_count += len(strip_regions)

    original.save(output_path, quality=95)
    print(f"\n合計黒塗り: {masked_count} 件")
    print(f"保存しました: {output_path}")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python3 pms_mask_names.py <input_image> [output_image]")
        sys.exit(1)

    input_path = sys.argv[1]
    if len(sys.argv) >= 3:
        output_path = sys.argv[2]
    else:
        parts = input_path.rsplit('.', 1)
        output_path = parts[0] + '_masked.' + (parts[1] if len(parts) > 1 else 'jpg')

    mask_names(input_path, output_path)
