import pymupdf
import re
import sys
import os
import json
import base64
import io
import time
from datetime import datetime
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')

VALENCE_MAP = {
    "very unpleasant": 0, "depressed": 0, "miserable": 0, "devastated": 0,
    "sad": 0, "hopeless": 0, "grief": 0,
    "unpleasant": 1, "anxious": 1, "scared": 1, "drained": 1, "lonely": 1, "hurt": 1, "annoyed": 1,
    "frustrated": 1, "angry": 1,
    "slightly unpleasant": 2, "uneasy": 2, "worried": 2, "disappointed": 2, "stressed": 2,
    "neutral": 3, "indifferent": 3,
    "slightly pleasant": 4, "content": 4, "peaceful": 4, "relieved": 4, "calm": 4,
    "pleasant": 5, "happy": 5, "grateful": 5, "excited": 5, "proud": 5, "good": 5,
    "very pleasant": 6, "joyful": 6, "euphoric": 6, "blissful": 6, "delighted": 6
}

def determine_valence(labels):
    for l in labels:
        l_lower = l.lower()
        for k, v in VALENCE_MAP.items():
            if k in l_lower:
                return v
    return 3

def clean_apple_text(text):
    if not text:
        return ""
    # Fix Apple PDF ligatures
    text = text.replace('\ufb01', 'fi').replace('\ufb02', 'fl')
    text = text.replace('ﬁ', 'fi').replace('ﬂ', 'fl')
    text = text.replace('\xa0', ' ')
    # Normalize smart quotes and dashes
    text = text.replace('“', '"').replace('”', '"')
    text = text.replace('‘', "'").replace('’', "'")
    return text.strip()

def resize_and_compress(pil_img, max_dim, max_bytes, initial_quality):
    w, h = pil_img.size
    if w > max_dim or h > max_dim:
        if w > h:
            h = max(1, round((h * max_dim) / w))
            w = max_dim
        else:
            w = max(1, round((w * max_dim) / h))
            h = max_dim
        pil_img = pil_img.resize((w, h), Image.Resampling.LANCZOS)
    
    # Convert RGBA / P to RGB
    if pil_img.mode in ("RGBA", "P"):
        background = Image.new("RGB", pil_img.size, (255, 255, 255))
        if pil_img.mode == "P":
            pil_img = pil_img.convert("RGBA")
        background.paste(pil_img, mask=pil_img.split()[3])
        pil_img = background
    elif pil_img.mode != "RGB":
        pil_img = pil_img.convert("RGB")

    quality = initial_quality
    out_bytes = io.BytesIO()
    pil_img.save(out_bytes, format="JPEG", quality=quality)
    while out_bytes.tell() > max_bytes and quality > 30:
        quality -= 10
        out_bytes = io.BytesIO()
        pil_img.save(out_bytes, format="JPEG", quality=quality)
        
    b64 = base64.b64encode(out_bytes.getvalue()).decode('utf-8')
    return f"data:image/jpeg;base64,{b64}", w, h

def tiptap_doc_from_text(plain_text):
    paragraphs = plain_text.split('\n')
    content = []
    for p in paragraphs:
        p_clean = p.strip()
        if p_clean:
            content.append({
                "type": "paragraph",
                "content": [{"type": "text", "text": p_clean}]
            })
        else:
            content.append({"type": "paragraph"})
    if not content:
        content = [{"type": "paragraph"}]
    return json.dumps({"type": "doc", "content": content})

pdf_path = "journalPdf/Journal 2.pdf"
doc = pymupdf.open(pdf_path)
total_pages = len(doc)
print(f"Loaded '{pdf_path}' with {total_pages} pages.")

date_pattern = re.compile(r'^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})')

# 1. First pass: group pages into entries
entry_page_groups = []
current_group = None

for pno in range(total_pages):
    page = doc[pno]
    text_dict = page.get_text("dict")
    
    first_spans = []
    for b in text_dict.get("blocks", []):
        if b.get("type") == 0:
            for l in b.get("lines", []):
                for s in l.get("spans", []):
                    t = clean_apple_text(s.get("text", ""))
                    if t:
                        first_spans.append((s, t))
    
    found_date = None
    for idx in range(min(5, len(first_spans))):
        s, t = first_spans[idx]
        if date_pattern.match(t):
            found_date = t
            break
            
    if found_date:
        if current_group:
            entry_page_groups.append(current_group)
        current_group = {
            "date_str": found_date,
            "pages": [pno]
        }
    else:
        if current_group:
            current_group["pages"].append(pno)
        else:
            current_group = {
                "date_str": "Tuesday, 6 October 2026",
                "pages": [pno]
            }

if current_group:
    entry_page_groups.append(current_group)

print(f"Detected {len(entry_page_groups)} entry page groups.")

# Track date counts for descending millisecond offsets (latest entry on day gets +offset)
date_occurrences = {}
for g in entry_page_groups:
    ds = g["date_str"]
    date_occurrences[ds] = date_occurrences.get(ds, 0) + 1

date_counters = {}

all_entries = []
all_media_docs = []

start_time = time.time()

for entry_idx, group in enumerate(entry_page_groups):
    date_str = group["date_str"]
    pages = group["pages"]
    
    # Calculate base date timestamp
    dt = datetime.strptime(date_str, "%A, %d %B %Y")
    base_ts = int(dt.timestamp() * 1000)
    
    # Offset so entries on same day preserve reverse-chronological order
    total_on_date = date_occurrences[date_str]
    curr_occ = date_counters.get(date_str, 0)
    date_counters[date_str] = curr_occ + 1
    # Latest in PDF gets higher time (e.g. 20:00, 19:00, 18:00...)
    hour_offset = max(0, (total_on_date - 1 - curr_occ)) * 3600 * 1000
    entry_ts = base_ts + 12 * 3600 * 1000 + hour_offset # noon base + offset
    
    entry_id = f"entry-{entry_ts}-{entry_idx:04d}"
    
    # Extract spans, text, photos, and moods across all pages in this group
    raw_lines = []
    title = ""
    mood_labels = []
    mood_impacts = []
    media_refs = []
    media_docs_for_entry = []
    
    for p_offset, pno in enumerate(pages):
        page = doc[pno]
        text_dict = page.get_text("dict")
        
        # Check spans
        spans_on_page = []
        for b in text_dict.get("blocks", []):
            if b.get("type") == 0:
                for l in b.get("lines", []):
                    for s in l.get("spans", []):
                        t = clean_apple_text(s.get("text", ""))
                        if t:
                            spans_on_page.append((s, t))
                            
        start_idx = 0
        if p_offset == 0:
            # First page of entry: identify date and title
            for idx in range(min(5, len(spans_on_page))):
                s, t = spans_on_page[idx]
                if date_pattern.match(t):
                    start_idx = idx + 1
                    if start_idx < len(spans_on_page):
                        next_s, next_t = spans_on_page[start_idx]
                        title = next_t
                        start_idx += 1
                    break
                    
        for idx in range(start_idx, len(spans_on_page)):
            s, t = spans_on_page[idx]
            font_sz = s.get("size", 0)
            
            # Mood detection
            if font_sz < 9.5 and ("more" in t or any(k in t.lower() for k in ["sad", "anxious", "peaceful", "happy", "lonely", "drained", "excited", "content", "calm", "scared", "frustrated", "angry", "stressed"])):
                clean_t = t.replace(" and more", "").replace(" and", "")
                parts = [p.strip() for p in clean_t.split(",") if p.strip() and p.strip().lower() != "more"]
                if not mood_labels:
                    mood_labels.extend(parts)
                else:
                    mood_impacts.extend(parts)
                continue
            elif font_sz < 9.5 and any(k in t.lower() for k in ["workout", "cal", "media"]):
                continue
                
            raw_lines.append(t)
            
        # Photos on page
        img_infos = page.get_image_info()
        for idx_on_page, info in enumerate(img_infos):
            w, h = info.get("width", 0), info.get("height", 0)
            bbox = info.get("bbox", (0, 0, 0, 0))
            # Filter out emojis (<50px) and mood glyphs (around x0 ~ 86, y0 ~ 128)
            if w > 100 and h > 100 and not (bbox[0] > 70 and bbox[0] < 100 and bbox[1] > 110 and bbox[1] < 150):
                try:
                    pix = page.get_pixmap(clip=pymupdf.Rect(bbox), dpi=150)
                    pil_img = Image.open(io.BytesIO(pix.tobytes("png")))
                    full_url, fw, fh = resize_and_compress(pil_img, 1600, 250000, 85)
                    thumb_url, tw, th = resize_and_compress(pil_img, 400, 25000, 75)
                    
                    mid = f"media-{entry_ts}-{len(media_refs)}"
                    media_refs.append({"id": mid, "w": fw, "h": fh})
                    m_doc = {
                        "id": mid,
                        "entryId": entry_id,
                        "full": full_url,
                        "thumb": thumb_url,
                        "w": fw,
                        "h": fh,
                        "createdAt": entry_ts
                    }
                    media_docs_for_entry.append(m_doc)
                    all_media_docs.append(m_doc)
                except Exception as e:
                    print(f"Warning: Photo extraction on page {pno+1}: {e}")
                    
    # Mood object
    mood = None
    attachment_order = []
    if mood_labels:
        valence = determine_valence(mood_labels)
        mood = {
            "valence": valence,
            "labels": mood_labels,
            "impacts": mood_impacts
        }
        attachment_order.append({"type": "mood"})
        
    for mref in media_refs:
        attachment_order.append({"type": "photo", "mediaId": mref["id"]})
        
    plain_text = "\n".join(raw_lines).strip()
    if not title:
        # derive from first line
        if raw_lines:
            first_l = raw_lines[0]
            title = first_l[:40] if len(first_l) > 40 else first_l
        else:
            title = "Untitled Entry"
            
    body_json = tiptap_doc_from_text(plain_text)
    words = [w for w in plain_text.split() if w]
    word_count = len(words)
    snippet = plain_text[:160].replace('\n', ' ')
    cover_thumb = media_docs_for_entry[0]["thumb"] if media_docs_for_entry else None
    
    entry_obj = {
        "id": entry_id,
        "title": title,
        "bodyJson": body_json,
        "plainText": plain_text,
        "snippet": snippet,
        "wordCount": word_count,
        "entryDate": entry_ts,
        "createdAt": entry_ts,
        "updatedAt": entry_ts,
        "folderIds": ["all"],
        "tags": [],
        "bookmarked": False,
        "pinned": False,
        "pinnedAt": None,
        "mood": mood,
        "media": media_refs,
        "coverThumb": cover_thumb,
        "songs": [],
        "location": None,
        "attachmentOrder": attachment_order,
        "deletedAt": None,
        "source": "apple-journal-pdf",
        "importKey": f"apple-pdf-{entry_idx}",
        "schemaVersion": 1
    }
    
    all_entries.append(entry_obj)
    
    if (entry_idx + 1) % 50 == 0 or entry_idx == len(entry_page_groups) - 1:
        elapsed = time.time() - start_time
        print(f"Processed {entry_idx + 1}/{len(entry_page_groups)} entries... ({len(all_media_docs)} photos extracted, {elapsed:.1f}s)")

doc.close()

output_path = "scripts/apple_journal_export.json"
os.makedirs("scripts", exist_ok=True)
with open(output_path, "w", encoding="utf-8") as f:
    json.dump({
        "total_entries": len(all_entries),
        "total_media": len(all_media_docs),
        "entries": all_entries,
        "mediaDocs": all_media_docs
    }, f, ensure_ascii=False)

print(f"\nSUCCESS! Exported {len(all_entries)} entries and {len(all_media_docs)} media docs to '{output_path}'.")
