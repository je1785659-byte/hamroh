#!/usr/bin/env bash
# Hamroh o'yinlarini avtomatik "minglab o'yin" sinovi. Ishga tushirish: bash tests/soak/run.sh
# Kerak: node, python3, playwright (chromium). Bog' va Port sinovlari uchun sayt 8392-portda ochiladi.
cd "$(dirname "$0")/../.." || exit 1
python3 -m http.server 8392 --bind 127.0.0.1 >/dev/null 2>&1 & SRV=$!; trap 'kill $SRV' EXIT; sleep 1
ok=0
run(){ echo; echo "=== $1"; shift; "$@" || { echo "!!! MUAMMO"; ok=1; }; }
run "Shaxmat qoidalari va 2000 o'yin" node tests/soak/chess.cjs 2000
run "Shashka qoidalari va 3000 o'yin" node tests/soak/shashka.cjs 3000
run "Yugur: 1000 yo'l" node tests/soak/yugur.cjs 1000
run "Savollar bazasi" python3 tests/soak/savollar.py
run "Bog' himoyasi: barcha bosqichlar" node tests/soak/bog.cjs 3
run "Bilyard: 300 aylanishli zarba" node tests/soak/bilyard.cjs
run "Port: missiyalar va 10 daqiqalik o'yin" node tests/soak/port.cjs
run "Bot sinovlari" bash -c 'cd bot && npm test --silent 2>&1 | grep -E "^# (pass|fail)"; cd .. && npm --prefix bot test --silent >/dev/null 2>&1'
echo; [ $ok = 0 ] && echo "HAMMASI JOYIDA" || echo "MUAMMO TOPILDI — yuqoriga qarang"; exit $ok
