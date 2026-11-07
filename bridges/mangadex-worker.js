/**
 * Yomu Addon Protocol — MangaDex Bridge Worker
 * 
 * Serverless bridge deployed to Cloudflare Workers / Deno / Node.js
 * Translates MangaDex REST API v5 to Yomu Addon Protocol JSON.
 */

const MD_API = "https://api.mangadex.org";
const USER_AGENT = "Yomu-Addon-Bridge/1.0.0 (https://github.com/yomu-community/addons)";

const MANIFEST = {
  id: "org.yomu.addon.mangadex",
  name: "MangaDex",
  version: "1.0.0",
  description: "Cầu nối trực tuyến kho truyện tranh MangaDex API v5 cho Yomu Reader",
  author: "Community",
  types: ["manga"],
  catalogs: [
    { id: "latest", name: "Mới cập nhật", type_name: "manga" },
    { id: "popular", name: "Đọc nhiều nhất", type_name: "manga" }
  ],
  supported_languages: ["vi", "en", "ja"]
};

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers for broad compatibility
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Content-Type": "application/json; charset=utf-8"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // 1. Manifest
      if (path === "/manifest.json" || path === "/") {
        return new Response(JSON.stringify(MANIFEST, null, 2), { headers: corsHeaders });
      }

      // 2. Catalog / Search: /catalog/manga/:catalog_id.json?page=0&size=20&search=keyword
      const catalogMatch = path.match(/^\/catalog\/manga\/([^\/]+)\.json$/);
      if (catalogMatch) {
        const catalogId = catalogMatch[1];
        const page = parseInt(url.searchParams.get("page") || "0", 10);
        const size = parseInt(url.searchParams.get("size") || "20", 10);
        const search = url.searchParams.get("search") || "";

        let mdUrl = `${MD_API}/manga?limit=${size}&offset=${page * size}&includes[]=cover_art`;
        if (search) {
          mdUrl += `&title=${encodeURIComponent(search)}`;
        } else if (catalogId === "popular") {
          mdUrl += "&order[followedCount]=desc";
        } else {
          mdUrl += "&order[latestUploadedChapter]=desc";
        }

        const mdRes = await fetch(mdUrl, { headers: { "User-Agent": USER_AGENT } });
        const data = await mdRes.json();

        const series = (data.data || []).map((item) => {
          const title = item.attributes?.title?.en || Object.values(item.attributes?.title || {})[0] || "Không tên";
          const desc = item.attributes?.description?.vi || item.attributes?.description?.en || "";
          const coverRel = item.relationships?.find((r) => r.type === "cover_art");
          const coverFile = coverRel?.attributes?.fileName;
          const coverUrl = coverFile ? `https://uploads.mangadex.org/covers/${item.id}/${coverFile}.256.jpg` : null;

          return {
            id: item.id,
            library_id: catalogId,
            title,
            summary: desc,
            books_count: 0,
            cover_url: coverUrl,
            genres: (item.attributes?.tags || []).map((t) => t.attributes?.name?.en).filter(Boolean)
          };
        });

        return new Response(JSON.stringify({ series }), { headers: corsHeaders });
      }

      // 3. Series chapters: /series/:series_id.json
      const seriesMatch = path.match(/^\/series\/([^\/]+)\.json$/);
      if (seriesMatch) {
        const seriesId = seriesMatch[1];
        const feedUrl = `${MD_API}/manga/${seriesId}/feed?limit=200&order[chapter]=asc&translatedLanguage[]=vi&translatedLanguage[]=en`;
        const mdRes = await fetch(feedUrl, { headers: { "User-Agent": USER_AGENT } });
        const data = await mdRes.json();

        const books = (data.data || []).map((ch, idx) => {
          const chapNum = parseFloat(ch.attributes?.chapter) || (idx + 1);
          const title = ch.attributes?.title ? `Ch. ${chapNum}: ${ch.attributes.title}` : `Chương ${chapNum}`;
          return {
            id: ch.id,
            series_id: seriesId,
            title,
            number: chapNum,
            pages_count: ch.attributes?.pages || 0,
            read: false
          };
        });

        return new Response(JSON.stringify({ books }), { headers: corsHeaders });
      }

      // 4. Chapter pages: /chapter/:chapter_id.json
      const chapterMatch = path.match(/^\/chapter\/([^\/]+)\.json$/);
      if (chapterMatch) {
        const chapterId = chapterMatch[1];
        const atHomeUrl = `${MD_API}/at-home/server/${chapterId}`;
        const mdRes = await fetch(atHomeUrl, { headers: { "User-Agent": USER_AGENT } });
        const data = await mdRes.json();

        const baseUrl = data.baseUrl;
        const hash = data.chapter?.hash;
        const fileNames = data.chapter?.dataSaver || data.chapter?.data || [];
        const quality = data.chapter?.dataSaver ? "data-saver" : "data";

        const pages = fileNames.map((file, i) => ({
          number: i + 1,
          url: `${baseUrl}/${quality}/${hash}/${file}`
        }));

        return new Response(JSON.stringify({ pages }), { headers: corsHeaders });
      }

      return new Response(JSON.stringify({ error: "Endpoint not found" }), {
        status: 404,
        headers: corsHeaders
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: corsHeaders
      });
    }
  }
};
