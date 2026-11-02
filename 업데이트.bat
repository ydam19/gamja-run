@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo  감자 달려 업데이트
echo.
set /p msg= 무엇을 바꿨나요? (예: 새 옷 추가) : 
if "%msg%"=="" set msg=업데이트
git add .
git commit -m "%msg%"
echo.
echo  폰에서 바꾼 내용이 있으면 먼저 가져와요...
git pull --no-rebase --no-edit
git push
echo.
echo  완료! 1~2분 뒤 https://gamja-run.vercel.app 에 반영돼요.
echo.
pause
