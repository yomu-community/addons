# Yomu Community Addons Repository

Official decentralized community extensions & sources repository for [Yomu Reader](https://github.com/yomu-community/yomu).

## Quick Start for Users

### 1. Add Community Repository Index
Copy the link below and paste it into Yomu (`Settings -> Sources -> Addons`):

```text
https://raw.githubusercontent.com/yomu-community/addons/main/index.json
```

Or via GitHub Pages:
```text
https://yomu-community.github.io/addons/index.json
```

---

## Available Addons

| Addon Name | Type | Manifest Link | Description |
| :--- | :---: | :--- | :--- |
| **MangaDex Bridge** | `manga` | `https://mangadex-bridge.yomu-addons.workers.dev/manifest.json` | Khám phá manga, manhwa trực tuyến từ MangaDex API v5 |
| **Project Gutenberg** | `book` | `https://raw.githubusercontent.com/yomu-community/addons/main/static-addons/gutenberg-classics.json` | Hơn 70.000 tác phẩm văn học kinh điển thế giới (Public Domain) |

---

## For Developers: Creating an Addon

Yomu Addons use a lightweight HTTP/JSON protocol inspired by Stremio.
Check [`schemas/manifest.schema.json`](./schemas/manifest.schema.json) for the full specification.

To submit your addon, open a Pull Request modifying `index.json`.
