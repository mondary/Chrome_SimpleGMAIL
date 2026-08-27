import os
import json
import sqlite3
import tempfile
import unittest
from pathlib import Path

os.environ["SIMPLEMAIL_AUTH"] = "0"
os.environ["DEMO"] = "1"

import main


class SmokeTests(unittest.TestCase):
    def test_message_cache_is_folder_scoped(self):
        original = main.DB_PATH
        with tempfile.TemporaryDirectory() as directory:
            main.DB_PATH = Path(directory) / "simplemail.db"
            main._init_db()
            db = sqlite3.connect(main.DB_PATH)
            columns = [row[1] for row in db.execute("PRAGMA table_info(msg_detail_cache)")]
            primary_key = [row[1] for row in db.execute("PRAGMA table_info(msg_detail_cache)") if row[5]]
            db.close()
        main.DB_PATH = original
        self.assertEqual(columns, ["account", "folder", "uid", "data", "fetched_at"])
        self.assertEqual(primary_key, ["account", "folder", "uid"])

    def test_gmail_system_folder_keys(self):
        self.assertEqual(main._folder_simple_key("[Gmail]/All Mail"), "ALL MAIL")
        self.assertEqual(main._folder_simple_key("[Gmail]/Sent Mail"), "SENT MAIL")

    def test_imap_utf7_label_decoding(self):
        self.assertEqual(main._decode_imap_utf7("Projets/&AMk-t&AOk-"), "Projets/Été")
        self.assertEqual(main._decode_imap_utf7("R&D"), "R&D")

    def test_imap_utf7_label_encoding(self):
        label = "📭 Mail/🔖 Memo"
        self.assertEqual(main._decode_imap_utf7(main._encode_imap_utf7(label)), label)

    def test_gmail_categories_use_native_search(self):
        self.assertEqual(main._gmail_category_query("primary"), 'X-GM-RAW "category:primary"')

    def test_gmail_text_uses_native_search(self):
        self.assertEqual(main._gmail_search_query('from:alice "budget"'), 'X-GM-RAW "from:alice \\"budget\\""')

    def test_inbox_snapshot_expires_within_refresh_interval(self):
        self.assertLessEqual(main._INBOX_SNAPSHOT_TTL, 60)

    def test_disabled_accounts_are_not_connected(self):
        original = main.CONFIG_PATH
        try:
            with tempfile.TemporaryDirectory() as directory:
                main.CONFIG_PATH = Path(directory) / "config.json"
                main.CONFIG_PATH.write_text(json.dumps({"accounts": [{
                    "id": "off", "enabled": False,
                    "imap": {"password": "secret"}, "smtp": {"password": "secret"},
                }]}), encoding="utf-8")
                self.assertEqual(main.load_config(configured_only=True)["accounts"], [])
        finally:
            main.CONFIG_PATH = original


if __name__ == "__main__":
    unittest.main()
