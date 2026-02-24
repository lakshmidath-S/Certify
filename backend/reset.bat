@echo off
echo 🚀 Starting Database Wipe... > reset_log.txt
node scripts\wipe-db.js >> reset_log.txt 2>&1
echo. >> reset_log.txt
echo 👥 Verifying Users... >> reset_log.txt
node scripts\check-db.js >> reset_log.txt 2>&1
echo. >> reset_log.txt
echo ✅ Done. >> reset_log.txt
