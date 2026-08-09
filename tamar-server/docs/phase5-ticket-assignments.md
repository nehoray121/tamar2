# סיכום Phase 5

Phase 5 מומש בפועל במלואו כהרחבת Backend בלבד למודול הפניות הקיים. המימוש כולל שיוכים פעילים, היסטוריית שיוכים, הרשאות, פעולות יחידות ומרובות, optimistic concurrency, טרנזקציות, capabilities, realtime ו־OpenAPI 3.1.

## נתיב ה־Backend

ה־Backend היחיד שבו בוצעה העבודה:

`C:\Users\Alpha\Desktop\tamar\tamar-react-app\tamar-server`

לא נעשה שימוש בנתיב הישן, לא נוצר Backend נוסף ולא אותחל מאגר Git מקונן.

## גיבוי ומצב התחלתי

- נוצר גיבוי immutable לפני השינויים תחת:
  `C:\Users\Alpha\Desktop\tamar\tamar-server-backups\phase4-baseline-before-phase5-20260720-135921`
- הגיבוי כולל 119 קבצים, רשימת קבצים וחתימות SHA-256.
- בדיקת הסיום אימתה 119 מתוך 119 חתימות, ללא חוסר או שינוי.
- כל 119 קובצי הגיבוי נשארו read-only.
- לא הועתקו `.env`, סודות, `node_modules`, לוגים או תוצרי בדיקות.
- מצב הבסיס: 103 קובצי JavaScript תקינים, 181/181 בדיקות עוברות ו־smoke עובר.

## מצב המערכת שנמצא

נמצא Backend פעיל שכבר כולל את תשתיות Phases 1–4: Express, MongoDB Replica Set, Mongoose, Socket.IO, אימות Access Token, הרשאות והיררכיה ארגונית קנונית, ומודול Ticket עם `Ticket`, `TicketSequence`, `TicketHistory`, מספור אטומי, concurrency ו־realtime.

Phase 5 הורחב מעל הארכיטקטורה הקיימת ולא שוכפל אף רכיב מאושר.

## גבולות Phase 5

המימוש מוגבל לניהול שיוכי פניות. לא חובר Frontend ולא נוספו Transfers, chat, attachments, categories, pinning, personal ordering, notifications, dashboards, exports או יכולות Phase 6.

## מודל TicketAssignment

נוסף מודל strict עם השדות הקנוניים: מזהי הפנייה וההיררכיה, המשתמש המשויך, מבצע השיוך, זמן ומקור השיוך, מצב פעיל, פרטי סיום ו־metadata בטוח ומוגבל.

המודל אוכף:

- רשומה פעילה ללא שדות סיום.
- רשומה שהסתיימה עם זמן וסיבת סיום.
- `endedBy` עבור הסרה ידנית או מרובה.
- אי־פתיחה מחדש של רשומה היסטורית.
- יצירת רשומה חדשה כאשר אותו משתמש משויך מחדש.
- חסימת מחיקה פיזית ועריכה חופשית של היסטוריית השיוכים דרך שכבת המודל.
- metadata ללא request bodies, tokens או מידע אישי.

יוצר הפנייה אינו משויך אוטומטית; פנייה חדשה ממשיכה להיווצר עם `activeAssigneeIds: []`.

## אינדקסים

נוספו האינדקסים הממוקדים הבאים:

1. `ticketId + userId`, ייחודי חלקית כאשר `isActive=true`, למניעת שיוך פעיל כפול.
2. `ticketId + isActive + assignedAt`, לשליפת שיוכים פעילים לפנייה.
3. `userId + isActive + assignedAt`, לשליפת פניות פעילות למשתמש.
4. `roomId + isActive + assignedAt`, לשליפת שיוכים פעילים בחדר.
5. `ticketId + assignedAt + _id`, להיסטוריה כרונולוגית יציבה.
6. `assignedBy + assignedAt`, להיסטוריה לפי מבצע הפעולה.

## כללי משתמשים ניתנים לשיוך

משתמש ניתן לשיוך רק אם הוא פעיל, מחזיק membership פעיל וישיר לחדר הנוכחי של הפנייה בתפקיד `ROOM_USER` או `ROOM_MANAGER`, וכל שרשרת ההיררכיה של החדר פעילה ותואמת לפנייה.

`SYSTEM_ADMIN` או `SUPER_ADMIN` אינם ניתנים לשיוך מכוח סמכות הניהול בלבד. הם ניתנים לשיוך רק אם יש להם membership נוסף וישיר ומתאים בחדר. לא נוצרים משתמשים או memberships באופן אוטומטי.

## הרשאות שיוך

- `ROOM_USER`: אינו יכול לשייך את עצמו או אחרים, להסיר או לנקות שיוכים; `canAssign=false` תמיד.
- `ROOM_MANAGER`: יכול לנהל שיוכים רק בחדר המדויק שבסמכותו.
- `SYSTEM_ADMIN`: יכול לנהל שיוכים בחדרים תחת תת־הסביבה המדויקת שבסמכותו.
- `SUPER_ADMIN`: יכול לנהל שיוכים בתוך המערכת שבסמכותו.
- פנייה סגורה, משתמש לא פעיל, membership מבוטל או scope לא פעיל מחזירים `canAssign=false`.

סמכות המבצע נפרדת לחלוטין מזכאות משתמש היעד.

## החלפת שיוכים לפנייה יחידה

`PUT /api/tickets/:id/assignees` מחליף את כל קבוצת המשויכים הפעילה בטרנזקציה אחת. המימוש מנרמל ObjectIds, מסיר כפילויות, ממיין דטרמיניסטית, בודק הרשאות וזכאות, מסיים רשומות שהוסרו, יוצר רשומות חדשות, מעדכן את projection, מגדיל version פעם אחת וכותב אירוע היסטוריה יחיד.

מערך ריק מנקה את כל השיוכים. אותה קבוצה אפקטיבית מוחזרת כ־`EMPTY_ASSIGNMENT_CHANGE` ללא version, history או realtime.

## פעולות שיוך מרובות

`POST /api/tickets/bulk/assignees` תומך ב־`ADD`, `REMOVE` ו־`REPLACE`:

- עד 50 פניות ועד 50 משתמשים.
- כל הפניות חייבות להיות פתוחות ובאותו חדר.
- נדרש version מפורש לכל פנייה.
- הפעולה אטומית; כשל אחד מבטל את כולה.
- פנייה שהשתנתה מקבלת increment והיסטוריה פעם אחת בלבד.
- no-op חלקי אינו מכשיל פניות אחרות, אך no-op מלא מוחזר כ־`EMPTY_ASSIGNMENT_CHANGE`.
- מוחזר outcome דטרמיניסטי לכל פנייה שהתבקשה.

## Assignment History

`GET /api/tickets/:id/assignment-history` מספק היסטוריה כרונולוגית, paginated ובטוחה עם מצבי `ACTIVE`, `HISTORY` ו־`ALL`. רשומות שהסתיימו נשמרות, אינן נפתחות מחדש ואינן נמחקות פיזית.

## שילוב עם TicketHistory

נוסף אירוע `TICKET_ASSIGNEES_UPDATED`. כל mutation מוצלח כותב באותה טרנזקציה אירוע יחיד הכולל IDs שנוספו והוסרו, ספירות קודמת וחדשה, מקור `SINGLE` או `BULK`, actor, versions ושם השדה `activeAssigneeIds`.

לא נשמרים מספר אישי, hash זהות, token, claims, מסמכי User/Membership מלאים או גוף בקשה מלא.

## שילוב עם Ticket.activeAssigneeIds

`Ticket.activeAssigneeIds` נשאר projection יחיד ומהיר למצב הפעיל, ומתעדכן טרנזקציונית יחד עם `TicketAssignment`. לא נוסף שדה מקביל, ולא ניתן לשנות את projection דרך create או PATCH רגיל.

סגירת פנייה משמרת את השיוכים לצורכי תצוגה היסטורית. רק `OPEN` נכלל ב־My Tasks.

## Capabilities

`canAssign` מחושב בשרת לפי status, actor, membership ו־scope. `isReadOnly` מתחשב כעת גם ביכולת השיוך יחד עם edit ו־close. כל יכולות העתיד נשארו `false`, ובהן transfer, category, pin ו־chat.

## My Tasks

My Tasks ממשיך להחזיר פניות `OPEN` שבהן המשתמש הוא היוצר או נמצא ב־`activeAssigneeIds`. הסרת משויך מסירה את הפנייה מהרשימה שלו אם אינו היוצר; היוצר נשאר ברשימה. השיוך אינו עוקף authorization לחדר, ו־membership שבוטל מסיר גישה.

## Optimistic Concurrency

החלפה יחידה דורשת `If-Match`. חסר מוחזר כ־HTTP 428 `PRECONDITION_REQUIRED`; version ישן מוחזר כ־HTTP 409 `VERSION_CONFLICT`. פעולות bulk דורשות version לכל פנייה. כותבים מקבילים אינם יכולים לדרוס זה את זה.

## Transactions

Ticket, רשומות TicketAssignment ו־TicketHistory נכתבים באותה MongoDB transaction. rollback מבטל projection, יצירה, סיום רשומות ו־history יחד. realtime נשלח רק לאחר commit, וכשל transport אינו מבטל תוצאה שכבר נשמרה.

## API Endpoints

- `PUT /api/tickets/:id/assignees`
- `GET /api/tickets/:id/assignable-users`
- `GET /api/tickets/:id/assignment-history`
- `POST /api/tickets/bulk/assignees`

כל הנתיבים מאומתים דרך תשתית ה־Access Token וה־membership הקיימת, משתמשים ב־strict validation וב־anti-enumeration. לא הותקנו נתיבי transfer או `assign-me`.

## Realtime Events

נוסף `assignment:updated` לכל פנייה שהשתנתה, לצד אירועי Ticket הקיימים. payload מכיל routing IDs, version וספירות בלבד; הוא אינו מכיל שמות, email, מידע אישי, תיאור פנייה או body עסקי.

## Socket.IO Authorization

הפרסום משתמש רק בחדרי Socket.IO שנגזרים בצד השרת עבור system, sub-environment ו־room. לא נוסף listener שמאפשר ללקוח להצטרף לחדר שרירותי. משתמשים בסקופ מורשה מקבלים invalidation בלבד.

## OpenAPI 3.1

נוסף `docs/openapi/tickets-phase5-assignments.yaml`, המתעד רק את ארבעת נתיבי Phase 5, schemas, validation, auth, ETags, שגיאות ותגובות. הקובץ נטען ונבדק כ־OpenAPI 3.1 תקין בבדיקה אוטומטית.

## קבצים שנוצרו

- `src/modules/tickets/domain/assignmentConstants.js`
- `src/modules/tickets/models/TicketAssignment.js`
- `src/modules/tickets/repositories/TicketAssignmentRepository.js`
- `src/modules/tickets/services/TicketAssigneeSummaryService.js`
- `src/modules/tickets/services/TicketAssignmentRealtimePublisher.js`
- `src/modules/tickets/services/TicketAssignmentService.js`
- `src/modules/tickets/controllers/TicketAssignmentController.js`
- `src/modules/tickets/validation/assignmentValidation.js`
- `docs/openapi/tickets-phase5-assignments.yaml`
- `tests/phase5-ticket-assignments.unit.test.js`
- `tests/phase5-ticket-assignments.integration.test.js`
- `tests/phase5-ticket-assignments-http.integration.test.js`
- `tests/phase5-ticket-assignments-resilience.integration.test.js`
- `docs/phase5-ticket-assignments.md`

## קבצים ששונו

- `src/modules/tickets/domain/constants.js`
- `src/modules/tickets/services/TicketAuthorizationService.js`
- `src/modules/tickets/services/TicketCapabilityService.js`
- `src/modules/tickets/services/ticketDto.js`
- `src/repositories/UserRepository.js`
- `src/repositories/OrganizationMembershipRepository.js`
- `src/modules/tickets/repositories/TicketRepository.js`
- `src/modules/tickets/services/TicketService.js`
- `src/routes/ticketAssignments.routes.js`
- `src/services/createServiceContainer.js`
- `src/app.js`
- `src/server.js`
- `tests/helpers/testDatabase.js`
- `tests/phase4-contract.test.js`
- `scripts/run-tests.js`

## חבילות שנוספו

לא נוספו חבילות. `tamar-server/package.json` ו־`tamar-server/package-lock.json` נשארו עם חתימות הבסיס:

- Backend `package.json`: `BB3BA5C7C65296988280A4B2DAED331E400A2B0439CA3D032FA410BCF569D0D2`
- Backend `package-lock.json`: `160A7DE1FA63D00B9CAEF04269134882577F8B4D3D7A34CC99CD3065ED0CA86E`

`npm ls --depth=0` הסתיים בהצלחה וכל התלויות פתורות. `npm audit --omit=dev` הסתיים עם 0 חולשות.

## בדיקות שהורצו

- baseline syntax, tests ו־smoke לפני המימוש.
- syntax לכל JavaScript תחת `src`, `tests` ו־`scripts`.
- כל סוויטת Phases 1–5.
- 33 בדיקות Phase 5 ייעודיות: model, authorization matrix, eligibility, single, bulk, history, HTTP, rollback, concurrency, realtime, My Tasks, strict validation ו־OpenAPI.
- smoke של Phase 1 ותשתיות האימות/Socket.IO.
- health, readiness מחובר ו־readiness מנותק.
- בקשות ללא token, עם token שגוי ועם token בדיקה חתום.
- frontend production build לצורכי regression בלבד.
- בדיקת בידוד MongoDB וקריאת production בלבד.
- בדיקת חתימות הגיבוי והשוואת package hashes.

## תוצאות Tests / Smoke / Build / Lint

- Syntax: PASS, 115 קובצי JavaScript.
- Tests: PASS, 214/214, לעומת 181/181 בבסיס.
- Phase 5 tests: PASS, 33/33.
- Smoke: PASS, כולל health 200, readiness 200, readiness מנותק 503, CORS 403, auth חסר/שגוי 401, token חתום, Socket.IO authentication ו־graceful shutdown.
- Frontend build: PASS, 143 modules transformed. נשארה אזהרת Vite קיימת על chunk מעל 500 kB; לא בוצע תיקון Frontend שאינו קשור.
- Lint: לא קיים script בשם lint ב־Backend ולכן לא הורץ lint נפרד.
- `npm audit --omit=dev`: PASS, נמצאו 0 חולשות.

## MongoDB Test Isolation

כל הבדיקות המוטטיביות מוגבלות ל־`tamar_test`; helper הבדיקות מסרב לפעול ללא `NODE_ENV=test`, מאמת את שם המסד לפני ניקוי או drop, ומנקה את מסד הבדיקות בסיום. בדיקת הסיום אישרה ש־`tamar_test` אינו קיים לאחר הריצה.

## בדיקת נתוני Production

בוצעה בדיקה read-only למסד `tamar` לאחר כל הבדיקות. נמצאו 0 מסמכים ב־`systems`, `environments`, `subenvironments`, `rooms`, `users`, `organizationmemberships`, `accessrequests`, `tickets`, `tickethistories`, `ticketsequences` ו־`ticketassignments`.

לא נוצרו נתוני Assignment, Ticket או נתוני בדיקה אחרים ב־Production, ולא בוצע ניקוי או seed ל־Production.

## השוואת מצב קבצים

- שינויים תחת `tamar-server`: רק קובצי ה־Backend והתיעוד המפורטים בדוח זה.
- קבצים קיימים מחוץ ל־`tamar-server`: היו 70 רשומות Git קיימות בבסיס ונשארו 70 בסיום; הן לא שונו במסגרת Phase 5.
- `tamar-server/` נשאר רשומה untracked אחת במאגר השורש, כצפוי.
- React `package.json`: ללא שינוי; SHA-256 נשאר `2687735672BFCCE91CF78955628D9DC68B3D5707B7E38F617A7CA8CEEFD1A65F`.
- React `package-lock.json`: ללא שינוי; SHA-256 נשאר `98F1FE9A8CA10F776FE65D03EC7561AFEA30ED3B26EBD56CF167EA84243818AB`.
- Frontend source: לא שונה במסגרת Phase 5.
- לא נוסף dependency של Backend לקובצי חבילות ה־React.
- לא אותחל `.git` בתוך `tamar-server`.

## מה לא מומש בכוונה

- לא נוצר מודל `TicketTransfer` ולא הותקן endpoint להעברה.
- לא נוצרו chat, `TicketMessage`, attachment, category, pin, personal-order או notification models.
- לא הותקנו reopen, delete, transfer או `assign-me` routes.
- לא חובר ה־Frontend ולא שונו JSX, CSS, stores או mocks.
- לא נשמר מספר אישי גולמי, token או claims בתוך שיוכים או history.
- הערך `TICKET_TRANSFERRED` נשמר רק כערך עתידי מותר במודל; Phase 5 אינו מפעיל אותו.

## סיכונים או החלטות פתוחות

- אין Event Outbox בשלב זה, בהתאם לגבולות שאושרו; כשל transport לאחר commit נבלע בבטחה והלקוחות מסתמכים על refetch/invalidation.
- טרנזקציות דורשות MongoDB Replica Set, כפי שכבר הוגדר במערכת.
- סגירת פנייה משמרת שיוכים פעילים לצורכי מצב היסטורי; זו החלטה מכוונת עד לאישור כלל אחר.
- אזהרת גודל chunk ב־Frontend אינה חלק מ־Phase 5 ולא טופלה.

## דרישות Phase 6

Phase 6 יידרש להגדיר באופן מפורש את Ticket Transfers, שינוי החדר, סיום שיוכים עם `TICKET_TRANSFERRED`, הרשאות שולח/מקבל, concurrency, history, realtime ומדיניות rollback. אין להתחיל זאת ללא אישור מפורש.

## אישור עצירה

Phase 5 מומש ולא רק תוכנן. המימוש Backend-only, כל בדיקות הסיום עברו, לא נוצרו נתוני Production, לא שונו קובצי מקור Frontend או חבילות React, לא נוצר מאגר Git מקונן ו־Phase 6 לא התחיל.

העבודה נעצרת כאן וממתינה לאישור מפורש לפני Phase 6.
