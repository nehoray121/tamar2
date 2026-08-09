# הזדהות מקומית בפיתוח ו־SSO ב־Production

## עקרון האבטחה

Tamar משתמשת באותו מסלול Backend בשני המצבים: Access Token חתום נשלח כ־Bearer, מאומת מול issuer, audience, algorithm, expiry ו־JWKS, ורק לאחר האימות נשלף claim המספר האישי ומומר ל־HMAC. הטוקן מוכיח זהות בלבד; MongoDB הוא מקור האמת היחיד לתפקידים, scopes ו־memberships.

## Local development

הזרימה המקומית זמינה רק כאשר Vite רץ במצב development, הדגל VITE_TAMAR_LOCAL_PERSONAL_NUMBER_LOGIN=true, מקור הדפדפן loopback, ה־Backend תחת NODE_ENV=development, מסד הנתונים tamar_dev, וה־Backend מוגדר עם TAMAR_AUTH_MODE=local-personal-number.

הזרימה:

1. המשתמש מזין מספר פיתוח סינתטי במסך המקומי.
2. ה־Frontend שולח אותו רק ל־http://127.0.0.1:4100/token.
3. ספק הזהות המקומי מנפיק RS256 Access Token קצר־חיים.
4. ה־Backend מאמת אותו דרך http://127.0.0.1:4100/.well-known/jwks.json.
5. /api/auth/me מבצע HMAC lookup ומחזיר User ו־memberships אמיתיים מ־tamar_dev.
6. בחירת Environment ו־Room ממשיכה בנתיב הרגיל.
7. HTTP ו־Socket.IO משתמשים באותו token provider.

הטוקן והמפתח הפרטי נשמרים בזיכרון בלבד. אין refresh token. לאחר תפוגה מזינים שוב את המספר הסינתטי.

## Production SSO

ב־Production אין מסך מספר אישי, אין קריאה ל־local IdP ואין fallback מקומי. המארח הארגוני או SharePoint מספק adapter באחד הממשקים הקיימים:

- configureAccessTokenProvider(async () => accessToken)
- globalThis.__TAMAR_AUTH__.getAccessToken()

ה־Backend מקבל רק Bearer token ארגוני ומאמת אותו מול issuer/JWKS שהוגדרו ל־Production. המספר האישי מגיע רק מ־claim חתום ומאומת.

## הפרדת מסדי נתונים

| שימוש | NODE_ENV | מסד |
|---|---|---|
| Production | production | tamar |
| פיתוח ידני | development | tamar_dev |
| בדיקות אוטומטיות ו־E2E | test | tamar_test |

ה־guards מסרבים לכל שילוב אחר. בדיקות אינן מוחקות את tamar_dev; seed/reset מקומי מסרב לכל מסד שאינו tamar_dev.

## הפעלה

מתוך C:\Users\Alpha\Desktop\tamar\tamar-react-app:

    npm run dev:tamar

הפקודה יוצרת HMAC secret יציב מחוץ ל־source תחת תיקיית TEMP המקומית, מזריעה tamar_dev, מפעילה IdP בפורט 4100, Backend בפורט 4000 ו־Vite בפורט 5174. היא מסרבת להתחיל אם פורט תפוס, ועוצרת ב־Ctrl+C רק את התהליכים שפתחה בלי למחוק את tamar_dev.

פקודות נוספות:

    npm run seed:tamar-dev
    npm run reset:tamar-dev

ה־reset מפורש והרסני ומותר רק עבור tamar_dev.

## משתמשי פיתוח סינתטיים

| משתמש | מספר פיתוח | הרשאה |
|---|---:|---|
| Development ROOM_USER A | 990000001 | ROOM_USER ב־Room A |
| Development ROOM_USER B | 990000002 | ROOM_USER ב־Room B |
| Development ROOM_MANAGER A | 990000003 | ROOM_MANAGER ב־Room A |
| Development SYSTEM_ADMIN | 990000004 | SYSTEM_ADMIN ב־SubEnvironment SE1 |
| Development SUPER_ADMIN | 990000005 | SUPER_ADMIN ב־System S1 |
| Development SUPER_ADMIN Local | 1234567 | SUPER_ADMIN ב־System S1; הזהות המבוקשת לפיתוח מקומי |
| Development no-access User | 990000006 | User פעיל ללא membership |

אלה מזהים סינתטיים בלבד. MongoDB שומר HMAC וארבע ספרות אחרונות, לא את הערך הגולמי.

## החלפת משתמש מקומי

לחץ על איפוס התחברות מקומית. הפעולה מנקה את הטוקן בזיכרון, סוגרת את Socket.IO, מנקה את הקשר ה־Environment/Room השמור, ומחזירה למסך ההזדהות. אין תפריט role ואין שינוי הרשאה מהדפדפן.

## משתני סביבה

Backend ו־tooling:

- AUTH_MODE=access_token
- TAMAR_AUTH_MODE=local-personal-number
- MONGODB_DATABASE=tamar_dev
- SSO_ISSUER=http://127.0.0.1:4100/
- SSO_JWKS_URI=http://127.0.0.1:4100/.well-known/jwks.json
- SSO_AUDIENCE=api://tamar-local-development
- SSO_PROVIDER_KEY=local-development
- IDENTITY_LOOKUP_HMAC_KEY מסופק אוטומטית על ידי ה־orchestrator.

Frontend:

- VITE_TAMAR_LOCAL_PERSONAL_NUMBER_LOGIN=true
- VITE_TAMAR_LOCAL_AUTH_URL=http://127.0.0.1:4100

## פורטים ו־loopback

- Frontend: 5174
- Backend: 4000
- Local IdP/JWKS: 4100

ספק הזהות המקומי מסרב ל־0.0.0.0, למסד שאינו tamar_dev, ל־Production ולמצב ללא flag מפורש.

## Socket.IO

boardSocket.js משתמש ב־getAccessToken() מאותו provider שמשמש את ה־HTTP client. אין Socket client נוסף ואין bypass.

## Production exclusion

ממשק הפיתוח מקבל מזהים סינתטיים בני 7 או 9 ספרות בלבד; חוזה ה־SSO הארגוני נשאר ללא שינוי.

המודולים המקומיים נטענים רק ב־dynamic import מאחורי import.meta.env.DEV והדגל המפורש. npm run verify:production-auth סורק את bundle ה־Production ומסרב אם נמצאו נכסי Local Auth, טקסט מסך מקומי, local issuer או local token URL.

## פתרון תקלות

- שירות ההזדהות המקומי אינו זמין: בדוק ש־npm run dev:tamar פעיל ושפורט 4100 פנוי.
- לא נמצא משתמש פיתוח תואם: הרץ npm run seed:tamar-dev ובחר אחד מהמזהים הסינתטיים.
- מסך SSO unavailable ב־Production: המארח הארגוני טרם רשם token provider; אין fallback מקומי.
- token expired: בצע כניסה מקומית מחדש.
- no memberships: המשתמש אומת, אך יוצג מצב ללא סביבות מורשות.

## Security non-goals

אין כאן password login, refresh token, local production endpoint, role selector, frontend-minted token, הרשאה מתוך claims, או תמיכה ב־Production personal-number form.
