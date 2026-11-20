# User guide

Open **http://localhost:3080** after starting the project. The left navigation contains the library, **Ôn tập**, **Luyện tập hôm nay**, and **In & xuất tệp**. The top right **Thêm từ mới** button opens the editor.

## Save a word in context

While reading “The plane will take off soon,” click **Thêm từ mới**, enter `take off` in **Từ / cụm từ**, add the original sentence, choose a **Thư mục**, and click **Lưu từ**. A definition is optional. The entry appears in the library and is due for review immediately.

**Tra Cambridge** requests available senses. Tick **Tra Anh–Việt** to try the bilingual page; select a matching sense. If lookup fails, click **Mở trang Cambridge** to compare manually, or save with the meaning blank. Expand the optional fields for an English definition, Vietnamese meaning, pronunciation, source link, context note, notes, tags, and up to two extra examples. Example translations are optional. The app does not translate sentences automatically.

## Find and maintain entries

Use **Tìm từ, nghĩa hoặc ghi chú…** above library cards and **Lọc thư mục** beside it. The buttons at the right change card/list layout. Click a card for details, then **Chỉnh sửa** or **Xóa từ**. The pencil button on a card also edits. Press **Lưu thay đổi** when done. If another device changed the entry, reload before retrying.

Open settings using **Lưu từ khi lướt web** at the top right. Under **Quản lý thư mục**, click **Thêm thư mục** or the delete icon beside a folder. Deleting a folder moves its words to **Chưa phân loại**.

## Review

Choose **Ôn tập** on the left. Read the front, press **Lật thẻ xem nghĩa**, then **Đã nhớ** or **Chưa nhớ**. **Ẩn tiếng Việt** toggles translations. The card back also allows editing. Only due cards in the current folder appear; see [review scheduling](data-model.md#review-schedule).

## Daily sentence practice and related words

Choose **Luyện tập hôm nay** to practice up to ten due words from the whole library, oldest due first. The app uses your browser's timezone for the daily date. A fixed session is saved when eligible questions exist; reload or return later to resume it. Completing it does not create another session that day. An empty library starts no session.

Each question masks every exact occurrence of the saved word or phrase in its original sentence or an example. Enter the English answer and press **Kiểm tra**. Grading ignores case, Unicode composition and extra whitespace, but does not accept synonyms, inflections or spelling errors. Correct answers advance the existing review schedule; incorrect answers reset it to tomorrow. Submitting a question again does not change scheduling twice. If the word was edited, deleted or reviewed elsewhere, the question is skipped without changing its schedule.

Words without a suitable sentence remain available in **Ôn tập**. Use **Bổ sung ví dụ** to add a sentence containing the exact saved word. Newly saved entries keep the usual immediate due date and do not join an already created daily session.

Word details and submitted practice answers show up to five optional **Từ liên quan** suggestions from Cambridge. Labels distinguish explicit synonyms, antonyms and word families from SMART Vocabulary topic relationships. Availability depends on Cambridge's page content and access; the app does not promise every relationship type. Successful results are cached for 24 hours, with older results usable during a source failure. No AI generates meanings or examples.

Press **Tạo từ** to open an editable draft. Use **Tra Cambridge** or enter a meaning and examples yourself, then **Lưu từ** to add it. Closing the form adds nothing. Previously saved terms are excluded from suggestions. Daily sessions and suggestion caches are not included in JSON/CSV exports; use a database backup to preserve them.

## Print and move content

Choose **In & xuất tệp**. Select a folder and **Tài liệu học** or **Phiếu tự kiểm tra + đáp án**. **Hiện tiếng Việt** and **Kèm ví dụ bổ sung** adjust the sheet. Press **In / Lưu PDF** and choose a printer or Save as PDF in the browser dialog. Use Chrome/Edge if an embedded browser cannot open it.

**Xuất CSV** and **Sao lưu JSON** download the currently filtered entries. In settings, **Tải JSON** exports all entries and **Nhập JSON** imports a Wordgarden JSON file. Existing term/definition pairs are skipped; newly imported entries start review again. To retain review history, use a [database backup](operations.md#database-backup-and-restore). For capture, see the [extension guide](extension.md).
