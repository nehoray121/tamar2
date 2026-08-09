# Phase 10: Ticket Chat Frontend

## מיקום וגבולות

הצ׳אט האמיתי מותקן בתוך חלון פרטי הפנייה הקיים ב־`TicketModal.jsx`. הוא טקסטואלי בלבד ואינו מוסיף קבצים, תמונות, תגובות, התראות, read receipts, typing או נוכחות.

## מקור אמת וזהויות

- קיימת זרימת Message אחת לכל Ticket.
- כל קריאות Message משתמשות ב־Ticket ID.
- שורת Board חיצונית ממשיכה להשתמש ב־Transfer ID עבור מצב הלוח, אך מעבירה ל־Chat את `ticketId`.
- אותו Chat נשמר בפנייה פתוחה, בפנייה סגורה ולאורך העברות A→B→C.

## API ואימות

`ticketMessagesApi.js` משתמש ב־`authenticatedHttpClient` הקיים ובארבעת הנתיבים הקנוניים בלבד: GET/POST `/api/tickets/:id/messages` ו־PATCH/DELETE `/api/tickets/:id/messages/:messageId`. ה־Access Token מגיע ממנגנון ה־SSO הקיים; אין token מקומי, fallback מדומה או אימות לפי מספר אישי.

## הרשאות ו־DTO

ה־frontend אינו מסיק הרשאה מתפקיד. כתיבה תלויה ב־`ticket.capabilities.canWriteChat`; עריכה ומחיקה תלויות ביכולות של כל Message. מחבר יכול לשנות רק הודעה חיה שלו. מחיקה היא soft delete ומוצגת כ־tombstone ללא תוכן קודם.

## טעינה, Pagination ו־Scroll

פתיחת Chat טוענת במקביל את פרטי ה־Ticket ואת עמוד ההודעות האחרון. עמודים ישנים נטענים בעזרת opaque `before` cursor, מתמזגים לפי Message ID וגרסה ומוצגים כרונולוגית. בעת prepend נמדד שינוי גובה הגלילה כדי לשמור את העוגן. כשמשתמש אינו בתחתית מוצג חיווי להודעות חדשות במקום קפיצה.

## כתיבה, Idempotency ו־Concurrency

לכל draft חדש נוצר UUID v4 קריפטוגרפי כ־`clientMessageId`; retry שומר את אותו מזהה. עריכה ומחיקה שולחות Message ETag ב־`If-Match`. ב־version conflict נטענת אמת השרת מחדש, draft העריכה נשמר וניתן לנסות שוב.

## Realtime ו־Lifecycle

אירועי Chat מצטרפים ל־Socket.IO singleton המאומת הקיים ב־`boardSocket.js`. האירועים הם invalidation בלבד ומסוננים לפי Ticket ID; REST הוא נתיב הכתיבה היחיד. invalidations מתלכדים, reconnect גורם לרענון חסום, ו־unsubscribe מסיר listeners. AbortController ודור בקשה מונעים מתגובה מאוחרת של Ticket קודם לדרוס Ticket נוכחי; אובדן הרשאה מנקה את ההודעות הפעילות.

## Plain Text, RTL ונגישות

התוכן מוצג כטקסט React רגיל ללא `dangerouslySetInnerHTML`, עם שמירת שורות וכיוון טקסט בטוח. ל־composer ולפעולות יש תוויות נגישות בעברית, שגיאות הן `role="alert"`, ופעולות edit/delete מוצגות רק לפי capabilities.

## בדיקות

- 69 בדיקות frontend מכסות מודל, API, קומפוננטה, ארכיטקטורה ו־traceability.
- 13 תרחישי Browser E2E משתמשים ב־React, Backend, JWT/JWKS, MongoDB ו־Socket.IO אמיתיים ומבודדים.
- רגרסיית Phase 9V נשמרת בנפרד.

## Non-goals

Phase 10 אינו מוסיף attachments, uploads, private/internal notes, threads, reactions, mentions, notifications, typing, presence, read receipts, Message search, restore, hard delete, admin override או Socket write endpoints.
