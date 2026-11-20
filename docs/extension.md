# Browser extension

The unpacked Manifest V3 extension is in `extension/` (version 0.2.0). Start the local app first. Open `chrome://extensions` or `edge://extensions`, enable **Developer mode**, choose **Load unpacked**, and select this repository's `extension` folder. After changing extension code, press **Reload** on its card and reload pages already open.

Open the extension popup, enter `http://localhost:3080`, press **Kết nối Wordgarden**, grant localhost access, and choose a default folder. Enable the selection button for the current page or for all regular websites; broad access requires a separate permission grant. Some browser system pages, web stores, and PDFs cannot host injected controls.

Select a word or phrase on a page and press **Lưu từ** near the selection. The extension sends the selected term, containing sentence when extractable, and page URL directly to Wordgarden. It may save without a meaning. The page shows success or a duplicate notice. Right click a selection for **Lưu ngay vào Wordgarden** or **Mở form lưu …**. The last choice opens the web editor for adjustments before saving. Cambridge lookup menus, the selection lookup button, and sense-saving buttons are temporarily hidden. Reload the extension and already-open pages to remove old controls; ordinary selection capture still works on Cambridge pages. See the [restoration backlog](roadmap.md#temporarily-hidden-enrichment).

Quick capture uses a token tied to this extension ID and local user, valid for 30 days. The token stays in trusted extension storage, not the page content script. It is only available when `LOCAL_MODE=true`; in Google mode use **Mở form lưu …**. Rotating `AUTH_SECRET` invalidates tokens. If Docker is down or the token expires, reopen the popup and use **Kết nối lại**; use **Thử lưu lại từ vừa lỗi** for the last failed capture. There is no offline queue. If a default folder was deleted, the next capture goes to **Chưa phân loại**.

See [functional workflows](workflows.md#extension-capture) and [API reference](api.md#extension-api) for implementation details.
