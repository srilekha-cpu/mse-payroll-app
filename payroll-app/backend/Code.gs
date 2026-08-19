/**
 * MSE Tech Payroll System — Backend (Google Apps Script)
 * ========================================================
 * This script uses a Google Sheet as the database and exposes a JSON API
 * that the frontend (hosted on Netlify/GitHub Pages) calls via fetch().
 *
 * ONE-TIME SETUP:
 *   1. Create a new Google Sheet (any name), open Extensions > Apps Script.
 *   2. Paste this file in as Code.gs (delete the default boilerplate).
 *   3. Run the `setupSpreadsheet` function once (Run menu > select
 *      setupSpreadsheet > Run). Approve the permissions it asks for.
 *      This creates all tabs and seeds them with your May-July 2026 data.
 *   4. Deploy > New deployment > type "Web app".
 *        - Execute as: Me
 *        - Who has access: Anyone
 *      Copy the Web App URL — paste it into frontend/app.js as API_URL.
 *   5. Default logins created by setup (CHANGE THESE PASSWORDS immediately
 *      via the "Change Password" action or by editing the Users sheet):
 *        Owner:      username = owner       password = owner123
 *        Accountant: username = accountant  password = acc123
 */

// ---------------------------------------------------------------------------
// CONFIG
// ---------------------------------------------------------------------------
const SHEET_USERS = 'Users';
const SHEET_EMPLOYEES = 'Employees';
const SHEET_LEDGER = 'AdvanceLedger';
const SHEET_PAYROLL = 'PayrollData';
const SHEET_SESSIONS = 'Sessions';
const SHEET_AUDIT = 'AuditLog';

const SESSION_TTL_HOURS = 12;

// ---------------------------------------------------------------------------
// SEED DATA (from your May/June/July 2026 payroll files)
// ---------------------------------------------------------------------------
const SEED_EMPLOYEES = [{"EmpID": "E001", "Name": "ABDULLAH ALPARMAAN", "Basic": 3900.0, "FixedAllow": null, "FilmRate": null, "OTRate": 20.0}, {"EmpID": "E002", "Name": "ADAIKKAN PERIYAKARUPPAN", "Basic": 550.0, "FixedAllow": null, "FilmRate": null, "OTRate": 3.0}, {"EmpID": "E003", "Name": "ADHIMOOLAM GANESH", "Basic": 1300.0, "FixedAllow": null, "FilmRate": null, "OTRate": 5.0}, {"EmpID": "E004", "Name": "AKKINIRAJA BHARATH SANJAY", "Basic": 650.0, "FixedAllow": null, "FilmRate": null, "OTRate": 3.0}, {"EmpID": "E005", "Name": "ALAGARSAN UDHAYANITHI", "Basic": 600.0, "FixedAllow": null, "FilmRate": null, "OTRate": 3.0}, {"EmpID": "E006", "Name": "ANTHONY RAJ SATHRAK RAJA", "Basic": 550.0, "FixedAllow": null, "FilmRate": null, "OTRate": 3.0}, {"EmpID": "E007", "Name": "AROCKIYARAJ ISEN", "Basic": 600.0, "FixedAllow": null, "FilmRate": null, "OTRate": 3.0}, {"EmpID": "E008", "Name": "ARUNACHALAM SANKAR", "Basic": 1800.0, "FixedAllow": null, "FilmRate": 0.6, "OTRate": 3.0}, {"EmpID": "E009", "Name": "ARUNAGIRI KANNAN", "Basic": 500.0, "FixedAllow": 250.0, "FilmRate": null, "OTRate": 3.0}, {"EmpID": "E010", "Name": "ASHOKKUMAR SRI VENKATESHWARA", "Basic": 550.0, "FixedAllow": null, "FilmRate": 0.5, "OTRate": 3.0}, {"EmpID": "E011", "Name": "BALASUBARAMANIYAN SIVAKUMAR", "Basic": 1350.0, "FixedAllow": 150.0, "FilmRate": 0.6, "OTRate": 4.0}, {"EmpID": "E012", "Name": "BALASUBRAMANIAN PRAVEEN", "Basic": 600.0, "FixedAllow": null, "FilmRate": null, "OTRate": 3.0}, {"EmpID": "E013", "Name": "BERCHMANS JOEL", "Basic": 850.0, "FixedAllow": null, "FilmRate": null, "OTRate": 3.0}, {"EmpID": "E014", "Name": "BOSE PARTHIBAN", "Basic": 600.0, "FixedAllow": 100.0, "FilmRate": 0.5, "OTRate": 3.0}, {"EmpID": "E015", "Name": "CHELLADURAI SABARI RAJAN", "Basic": 800.0, "FixedAllow": 200.0, "FilmRate": null, "OTRate": 3.0}, {"EmpID": "E016", "Name": "DIPANGKAR", "Basic": 1100.0, "FixedAllow": null, "FilmRate": null, "OTRate": 5.0}, {"EmpID": "E017", "Name": "EMRAN E", "Basic": 1500.0, "FixedAllow": null, "FilmRate": 0.5, "OTRate": 5.0}, {"EmpID": "E018", "Name": "GAJENDRAN DHIVAKARAN", "Basic": 975.0, "FixedAllow": 75.0, "FilmRate": 0.5, "OTRate": 3.0}, {"EmpID": "E019", "Name": "GANESAN MUTHUKUMAR", "Basic": 800.0, "FixedAllow": 250.0, "FilmRate": null, "OTRate": 4.0}, {"EmpID": "E020", "Name": "GOVINDARAJ RAJIV", "Basic": 1700.0, "FixedAllow": 0.0, "FilmRate": 0.6, "OTRate": 3.0}, {"EmpID": "E021", "Name": "GURUNATHAN MURUGANANTHAM", "Basic": 1100.0, "FixedAllow": 200.0, "FilmRate": null, "OTRate": 5.0}, {"EmpID": "E022", "Name": "ISLAM RAFIQUL", "Basic": 750.0, "FixedAllow": null, "FilmRate": null, "OTRate": 3.0}, {"EmpID": "E023", "Name": "ISLAM SIFUL", "Basic": 800.0, "FixedAllow": 50.0, "FilmRate": null, "OTRate": 4.0}, {"EmpID": "E024", "Name": "JAYARAMAN BASKAR", "Basic": 850.0, "FixedAllow": null, "FilmRate": null, "OTRate": 3.0}, {"EmpID": "E025", "Name": "JEYARAJ JANAGAR", "Basic": 2350.0, "FixedAllow": null, "FilmRate": null, "OTRate": 5.0}, {"EmpID": "E026", "Name": "KALAYARASAN AKASH", "Basic": 600.0, "FixedAllow": null, "FilmRate": null, "OTRate": 3.0}, {"EmpID": "E027", "Name": "KALIMUTHU SANKAR", "Basic": 1150.0, "FixedAllow": 100.0, "FilmRate": 0.6, "OTRate": 3.0}, {"EmpID": "E028", "Name": "KALYANASUNDARAM KARTHIKEYAN", "Basic": 600.0, "FixedAllow": null, "FilmRate": null, "OTRate": 3.0}, {"EmpID": "E029", "Name": "KAMBAN KANAGARAJ EMARSON RANJIT", "Basic": 700.0, "FixedAllow": 250.0, "FilmRate": null, "OTRate": 4.0}, {"EmpID": "E030", "Name": "KARUPPIAH CHANDRAN", "Basic": 650.0, "FixedAllow": 100.0, "FilmRate": null, "OTRate": 3.0}, {"EmpID": "E031", "Name": "KARUPPIAH MEYAPPAN", "Basic": 1100.0, "FixedAllow": 50.0, "FilmRate": null, "OTRate": 4.0}, {"EmpID": "E032", "Name": "KESAVAN NANDHEESWARAN", "Basic": 700.0, "FixedAllow": 100.0, "FilmRate": null, "OTRate": 3.0}, {"EmpID": "E033", "Name": "KOOLAIAN SUBRAMANIAN", "Basic": 1125.0, "FixedAllow": 125.0, "FilmRate": null, "OTRate": 4.0}, {"EmpID": "E034", "Name": "KUPPAN SABARIVASAN", "Basic": 2000.0, "FixedAllow": 200.0, "FilmRate": null, "OTRate": 5.0}, {"EmpID": "E035", "Name": "LAKSHMANAN MANIKANDAN", "Basic": 650.0, "FixedAllow": 250.0, "FilmRate": null, "OTRate": 3.0}, {"EmpID": "E036", "Name": "LAKSHMANAN VISWANATHAN", "Basic": 600.0, "FixedAllow": 150.0, "FilmRate": 0.5, "OTRate": 3.0}, {"EmpID": "E037", "Name": "MAHARASAN KAJENDRAN", "Basic": 1075.0, "FixedAllow": 125.0, "FilmRate": null, "OTRate": 5.0}, {"EmpID": "E038", "Name": "MAHATMA AKILAN", "Basic": 850.0, "FixedAllow": null, "FilmRate": null, "OTRate": 3.0}, {"EmpID": "E039", "Name": "MALAIRASU RAMARASU", "Basic": 1100.0, "FixedAllow": 150.0, "FilmRate": null, "OTRate": 3.0}, {"EmpID": "E040", "Name": "MANI KATHAVARAYAN", "Basic": 900.0, "FixedAllow": 100.0, "FilmRate": null, "OTRate": 4.0}, {"EmpID": "E041", "Name": "MANIGANDAN", "Basic": 1000.0, "FixedAllow": null, "FilmRate": null, "OTRate": null}, {"EmpID": "E042", "Name": "MANIKANDAN MANOJ", "Basic": 650.0, "FixedAllow": 100.0, "FilmRate": 0.5, "OTRate": 3.0}, {"EmpID": "E043", "Name": "MANIKAVASAGAM MAHENDRAN", "Basic": 800.0, "FixedAllow": 100.0, "FilmRate": 0.5, "OTRate": 3.0}, {"EmpID": "E044", "Name": "MARI KOTTAICHAMY", "Basic": 1000.0, "FixedAllow": 150.0, "FilmRate": null, "OTRate": 4.0}, {"EmpID": "E045", "Name": "MARIYAPPAN SABARIRAJAN", "Basic": 700.0, "FixedAllow": null, "FilmRate": null, "OTRate": 3.0}, {"EmpID": "E046", "Name": "MATHI ANTONY SIL KUPPER SINGH", "Basic": 2000.0, "FixedAllow": 200.0, "FilmRate": null, "OTRate": 5.0}, {"EmpID": "E047", "Name": "MEYYAPPAN MANIKANDAN", "Basic": 1230.0, "FixedAllow": 50.0, "FilmRate": null, "OTRate": 3.0}, {"EmpID": "E048", "Name": "MOHAN SELVAMURUGAN", "Basic": 700.0, "FixedAllow": 200.0, "FilmRate": null, "OTRate": 4.0}, {"EmpID": "E049", "Name": "MUNIYAMUTHU   SUBRAMANIAN", "Basic": 880.0, "FixedAllow": 100.0, "FilmRate": 0.6, "OTRate": 3.0}, {"EmpID": "E050", "Name": "MURUGAN DHINESH", "Basic": 600.0, "FixedAllow": null, "FilmRate": null, "OTRate": 3.0}, {"EmpID": "E051", "Name": "MURUGESAN SARAVANAN", "Basic": 950.0, "FixedAllow": null, "FilmRate": null, "OTRate": 4.0}, {"EmpID": "E052", "Name": "MUTHUKUMARASAMY  KAVITHASAN", "Basic": 650.0, "FixedAllow": null, "FilmRate": null, "OTRate": 3.0}, {"EmpID": "E053", "Name": "NATARAJAN SAKTHIJANARTHANAN", "Basic": 1310.0, "FixedAllow": 50.0, "FilmRate": 0.6, "OTRate": 3.0}, {"EmpID": "E054", "Name": "PADALA ANJINIKUMAR", "Basic": 1000.0, "FixedAllow": 150.0, "FilmRate": 0.5, "OTRate": 4.0}, {"EmpID": "E055", "Name": "PAKKIRISAMY SATHYARAJ", "Basic": 800.0, "FixedAllow": null, "FilmRate": null, "OTRate": 3.0}, {"EmpID": "E056", "Name": "PALANISAMY ABILASH", "Basic": 650.0, "FixedAllow": null, "FilmRate": null, "OTRate": 3.0}, {"EmpID": "E057", "Name": "PALANISAMY VIJYAKUMAR", "Basic": 1300.0, "FixedAllow": null, "FilmRate": null, "OTRate": 4.0}, {"EmpID": "E058", "Name": "PANDI SANTHAKUMAR", "Basic": 650.0, "FixedAllow": 100.0, "FilmRate": 0.5, "OTRate": 3.0}, {"EmpID": "E059", "Name": "PANNER SELVAM SATHIS", "Basic": 800.0, "FixedAllow": null, "FilmRate": null, "OTRate": 3.0}, {"EmpID": "E060", "Name": "PARAMASIVAM NATARAJAN", "Basic": 1300.0, "FixedAllow": 150.0, "FilmRate": null, "OTRate": 5.0}, {"EmpID": "E061", "Name": "PAUL APU", "Basic": 600.0, "FixedAllow": null, "FilmRate": null, "OTRate": 3.0}, {"EmpID": "E062", "Name": "PAZHANIYAPPAN AZHAGUMUTHU", "Basic": 850.0, "FixedAllow": null, "FilmRate": null, "OTRate": 4.0}, {"EmpID": "E063", "Name": "PERUMAL MOORTHY", "Basic": 1100.0, "FixedAllow": 100.0, "FilmRate": null, "OTRate": 4.0}, {"EmpID": "E064", "Name": "PRAKASH NITHISH", "Basic": 1000.0, "FixedAllow": null, "FilmRate": null, "OTRate": 3.0}, {"EmpID": "E065", "Name": "PRAKASH PRAVEEN RAJ", "Basic": 650.0, "FixedAllow": null, "FilmRate": null, "OTRate": 3.0}, {"EmpID": "E066", "Name": "RAJ VETHAMANICKAM", "Basic": 1400.0, "FixedAllow": 75.0, "FilmRate": 0.5, "OTRate": 3.0}, {"EmpID": "E067", "Name": "RAJA ASWIN", "Basic": 500.0, "FixedAllow": 300.0, "FilmRate": null, "OTRate": 3.0}, {"EmpID": "E068", "Name": "RAJARAMAN SANTHOSHKUMAR", "Basic": 550.0, "FixedAllow": 100.0, "FilmRate": null, "OTRate": 3.0}, {"EmpID": "E069", "Name": "RAMACHANDRAN BALAJI", "Basic": 2300.0, "FixedAllow": 0.0, "FilmRate": 35.0, "OTRate": 12.0}, {"EmpID": "E070", "Name": "RAMALINGAM PRASANTH", "Basic": 1130.0, "FixedAllow": 570.0, "FilmRate": 0.6, "OTRate": 4.0}, {"EmpID": "E071", "Name": "RAMAR MARISAN", "Basic": 980.0, "FixedAllow": null, "FilmRate": 0.6, "OTRate": 3.0}, {"EmpID": "E072", "Name": "RAMAR SATHYAJOTHI", "Basic": 1800.0, "FixedAllow": 200.0, "FilmRate": 58.0, "OTRate": 5.0}, {"EmpID": "E073", "Name": "RAMAYA MANIKANDAN", "Basic": 980.0, "FixedAllow": 230.0, "FilmRate": 0.6, "OTRate": 3.0}, {"EmpID": "E074", "Name": "RAVICHANDRAN PRAKASH", "Basic": 750.0, "FixedAllow": null, "FilmRate": null, "OTRate": 3.0}, {"EmpID": "E075", "Name": "RAVICHANDRAN SRIRAM", "Basic": 1100.0, "FixedAllow": 200.0, "FilmRate": null, "OTRate": 5.0}, {"EmpID": "E076", "Name": "RENGARAJ ELAVARASAN", "Basic": 600.0, "FixedAllow": null, "FilmRate": null, "OTRate": 3.0}, {"EmpID": "E077", "Name": "SADAIYAN BALAMURUGAN", "Basic": 1200.0, "FixedAllow": 250.0, "FilmRate": null, "OTRate": 4.0}, {"EmpID": "E078", "Name": "SAKTHIVEL SARGUNAM", "Basic": 850.0, "FixedAllow": 100.0, "FilmRate": 0.5, "OTRate": 3.0}, {"EmpID": "E079", "Name": "SAMBANTHAMOORTHY SIVARAMAN", "Basic": 1700.0, "FixedAllow": 150.0, "FilmRate": null, "OTRate": 5.0}, {"EmpID": "E080", "Name": "SANDRANU SAI NAGENDRA", "Basic": 750.0, "FixedAllow": null, "FilmRate": null, "OTRate": 3.0}, {"EmpID": "E081", "Name": "SANKAR ALAGUMANIKANDAN", "Basic": 650.0, "FixedAllow": null, "FilmRate": null, "OTRate": 3.0}, {"EmpID": "E082", "Name": "SELVARAJ AJITH KUMAR", "Basic": 700.0, "FixedAllow": 500.0, "FilmRate": null, "OTRate": 3.0}, {"EmpID": "E083", "Name": "SELVARAJ ARUN STALIN", "Basic": 800.0, "FixedAllow": 400.0, "FilmRate": null, "OTRate": 4.0}, {"EmpID": "E084", "Name": "SENTHILKUMAR POOVARASAN", "Basic": 600.0, "FixedAllow": null, "FilmRate": null, "OTRate": 3.0}, {"EmpID": "E085", "Name": "SENTHILKUMAR VISWANATHAN", "Basic": 600.0, "FixedAllow": null, "FilmRate": null, "OTRate": 3.0}, {"EmpID": "E086", "Name": "SHANMUGAVEL THIYAGARAJAN", "Basic": 600.0, "FixedAllow": 500.0, "FilmRate": null, "OTRate": 4.0}, {"EmpID": "E087", "Name": "SIVARAMAN SUNDARAJAN", "Basic": 1500.0, "FixedAllow": null, "FilmRate": 0.6, "OTRate": 5.0}, {"EmpID": "E088", "Name": "SIVASANKARAN VIJAYAKUMAR", "Basic": 980.0, "FixedAllow": 0.0, "FilmRate": 0.5, "OTRate": 3.0}, {"EmpID": "E089", "Name": "SUBBAIAH PRABU", "Basic": 550.0, "FixedAllow": null, "FilmRate": null, "OTRate": 3.0}, {"EmpID": "E090", "Name": "SUDHAKAR BALASUBRAMANIAN", "Basic": 1100.0, "FixedAllow": 100.0, "FilmRate": null, "OTRate": 4.0}, {"EmpID": "E091", "Name": "TAMILARASAN DINESHKUMAR", "Basic": 600.0, "FixedAllow": 100.0, "FilmRate": null, "OTRate": 3.0}, {"EmpID": "E092", "Name": "THALIYAN GEORGE JOMAN", "Basic": 2500.0, "FixedAllow": null, "FilmRate": 30.0, "OTRate": null}, {"EmpID": "E093", "Name": "THANGARASU SAKTHIVEL", "Basic": 800.0, "FixedAllow": null, "FilmRate": null, "OTRate": 3.0}, {"EmpID": "E094", "Name": "THEKKEKARA PRADEEP", "Basic": 1350.0, "FixedAllow": 75.0, "FilmRate": 0.6, "OTRate": 3.0}, {"EmpID": "E095", "Name": "THINESH VISHVA", "Basic": 600.0, "FixedAllow": null, "FilmRate": null, "OTRate": 3.0}, {"EmpID": "E096", "Name": "THOMAS SIVA PRASAD", "Basic": 900.0, "FixedAllow": null, "FilmRate": null, "OTRate": 3.0}, {"EmpID": "E097", "Name": "THURAIPANDIYAN JEYAKUMAR", "Basic": 800.0, "FixedAllow": 100.0, "FilmRate": 0.5, "OTRate": 3.0}, {"EmpID": "E098", "Name": "VAGISAN VASANTHAN", "Basic": 600.0, "FixedAllow": null, "FilmRate": null, "OTRate": 3.0}, {"EmpID": "E099", "Name": "VASUDEVAN GOPINATH", "Basic": 600.0, "FixedAllow": null, "FilmRate": null, "OTRate": 3.0}, {"EmpID": "E100", "Name": "VEDIYAPPAN SISUKUMAR", "Basic": 1200.0, "FixedAllow": null, "FilmRate": null, "OTRate": 5.0}, {"EmpID": "E101", "Name": "VELCY ARUL ANAND BRITTO", "Basic": 850.0, "FixedAllow": null, "FilmRate": null, "OTRate": 4.0}, {"EmpID": "E102", "Name": "VELUCHAMY BOOBALAN", "Basic": 750.0, "FixedAllow": 75.0, "FilmRate": 0.5, "OTRate": 3.0}, {"EmpID": "E103", "Name": "VENKATACHALAM SUDHAKAR", "Basic": 950.0, "FixedAllow": 250.0, "FilmRate": null, "OTRate": 3.0}, {"EmpID": "E104", "Name": "VIJENDRAN SURIYAPRAKASH", "Basic": 650.0, "FixedAllow": null, "FilmRate": null, "OTRate": 3.0}, {"EmpID": "E105", "Name": "VISWANATHAN ARUL", "Basic": 750.0, "FixedAllow": 250.0, "FilmRate": 0.6, "OTRate": 3.0}, {"EmpID": "E106", "Name": "WILLIAM JAYARAJ ANTHONY JAMES", "Basic": 750.0, "FixedAllow": null, "FilmRate": null, "OTRate": 3.0}, {"EmpID": "E107", "Name": "YENOSE JEYA MONOSE", "Basic": 650.0, "FixedAllow": 100.0, "FilmRate": null, "OTRate": 3.0}];
const SEED_LEDGER = [{"EmpID": "E011", "Name": "BALASUBARAMANIYAN SIVAKUMAR", "Date": "2026-05-01", "Amount": 200.0, "Notes": "ESTIMATED historical entry \u2014 reconstructed from earliest observed deduction. Please verify/correct actual amount given and date. Still being recovered as of July \u2014 outstanding balance likely NOT fully known; confirm true original amount."}, {"EmpID": "E019", "Name": "GANESAN MUTHUKUMAR", "Date": "2026-06-01", "Amount": 500.0, "Notes": "ESTIMATED historical entry \u2014 reconstructed from earliest observed deduction. Please verify/correct actual amount given and date."}, {"EmpID": "E020", "Name": "GOVINDARAJ RAJIV", "Date": "2026-06-01", "Amount": 490.0, "Notes": "ESTIMATED historical entry \u2014 reconstructed from earliest observed deduction. Please verify/correct actual amount given and date."}, {"EmpID": "E029", "Name": "KAMBAN KANAGARAJ EMARSON RANJIT", "Date": "2026-05-01", "Amount": 200.0, "Notes": "ESTIMATED historical entry \u2014 reconstructed from earliest observed deduction. Please verify/correct actual amount given and date."}, {"EmpID": "E035", "Name": "LAKSHMANAN MANIKANDAN", "Date": "2026-07-01", "Amount": 551.61, "Notes": "ESTIMATED historical entry \u2014 reconstructed from earliest observed deduction. Please verify/correct actual amount given and date."}, {"EmpID": "E039", "Name": "MALAIRASU RAMARASU", "Date": "2026-06-01", "Amount": 500.0, "Notes": "ESTIMATED historical entry \u2014 reconstructed from earliest observed deduction. Please verify/correct actual amount given and date. Still being recovered as of July \u2014 outstanding balance likely NOT fully known; confirm true original amount."}, {"EmpID": "E043", "Name": "MANIKAVASAGAM MAHENDRAN", "Date": "2026-05-01", "Amount": 200.0, "Notes": "ESTIMATED historical entry \u2014 reconstructed from earliest observed deduction. Please verify/correct actual amount given and date."}, {"EmpID": "E044", "Name": "MARI KOTTAICHAMY", "Date": "2026-05-01", "Amount": 200.0, "Notes": "ESTIMATED historical entry \u2014 reconstructed from earliest observed deduction. Please verify/correct actual amount given and date. Still being recovered as of July \u2014 outstanding balance likely NOT fully known; confirm true original amount."}, {"EmpID": "E046", "Name": "MATHI ANTONY SIL KUPPER SINGH", "Date": "2026-05-01", "Amount": 200.0, "Notes": "ESTIMATED historical entry \u2014 reconstructed from earliest observed deduction. Please verify/correct actual amount given and date. Still being recovered as of July \u2014 outstanding balance likely NOT fully known; confirm true original amount."}, {"EmpID": "E048", "Name": "MOHAN SELVAMURUGAN", "Date": "2026-07-01", "Amount": 200.0, "Notes": "ESTIMATED historical entry \u2014 reconstructed from earliest observed deduction. Please verify/correct actual amount given and date."}, {"EmpID": "E049", "Name": "MUNIYAMUTHU   SUBRAMANIAN", "Date": "2026-05-01", "Amount": 300.0, "Notes": "ESTIMATED historical entry \u2014 reconstructed from earliest observed deduction. Please verify/correct actual amount given and date. Still being recovered as of July \u2014 outstanding balance likely NOT fully known; confirm true original amount."}, {"EmpID": "E053", "Name": "NATARAJAN SAKTHIJANARTHANAN", "Date": "2026-05-01", "Amount": 250.0, "Notes": "ESTIMATED historical entry \u2014 reconstructed from earliest observed deduction. Please verify/correct actual amount given and date."}, {"EmpID": "E054", "Name": "PADALA ANJINIKUMAR", "Date": "2026-05-01", "Amount": 400.0, "Notes": "ESTIMATED historical entry \u2014 reconstructed from earliest observed deduction. Please verify/correct actual amount given and date. Still being recovered as of July \u2014 outstanding balance likely NOT fully known; confirm true original amount."}, {"EmpID": "E055", "Name": "PAKKIRISAMY SATHYARAJ", "Date": "2026-05-01", "Amount": 500.0, "Notes": "ESTIMATED historical entry \u2014 reconstructed from earliest observed deduction. Please verify/correct actual amount given and date."}, {"EmpID": "E062", "Name": "PAZHANIYAPPAN AZHAGUMUTHU", "Date": "2026-07-01", "Amount": 500.0, "Notes": "ESTIMATED historical entry \u2014 reconstructed from earliest observed deduction. Please verify/correct actual amount given and date."}, {"EmpID": "E067", "Name": "RAJA ASWIN", "Date": "2026-05-01", "Amount": 200.0, "Notes": "ESTIMATED historical entry \u2014 reconstructed from earliest observed deduction. Please verify/correct actual amount given and date."}, {"EmpID": "E069", "Name": "RAMACHANDRAN BALAJI", "Date": "2026-05-01", "Amount": 300.0, "Notes": "ESTIMATED historical entry \u2014 reconstructed from earliest observed deduction. Please verify/correct actual amount given and date. Still being recovered as of July \u2014 outstanding balance likely NOT fully known; confirm true original amount."}, {"EmpID": "E075", "Name": "RAVICHANDRAN SRIRAM", "Date": "2026-06-01", "Amount": 700.0, "Notes": "ESTIMATED historical entry \u2014 reconstructed from earliest observed deduction. Please verify/correct actual amount given and date."}, {"EmpID": "E088", "Name": "SIVASANKARAN VIJAYAKUMAR", "Date": "2026-05-01", "Amount": 200.0, "Notes": "ESTIMATED historical entry \u2014 reconstructed from earliest observed deduction. Please verify/correct actual amount given and date. Still being recovered as of July \u2014 outstanding balance likely NOT fully known; confirm true original amount."}, {"EmpID": "E093", "Name": "THANGARASU SAKTHIVEL", "Date": "2026-05-01", "Amount": 200.0, "Notes": "ESTIMATED historical entry \u2014 reconstructed from earliest observed deduction. Please verify/correct actual amount given and date. Still being recovered as of July \u2014 outstanding balance likely NOT fully known; confirm true original amount."}, {"EmpID": "E096", "Name": "THOMAS SIVA PRASAD", "Date": "2026-05-01", "Amount": 200.0, "Notes": "ESTIMATED historical entry \u2014 reconstructed from earliest observed deduction. Please verify/correct actual amount given and date. Still being recovered as of July \u2014 outstanding balance likely NOT fully known; confirm true original amount."}, {"EmpID": "E102", "Name": "VELUCHAMY BOOBALAN", "Date": "2026-05-01", "Amount": 200.0, "Notes": "ESTIMATED historical entry \u2014 reconstructed from earliest observed deduction. Please verify/correct actual amount given and date."}, {"EmpID": "E103", "Name": "VENKATACHALAM SUDHAKAR", "Date": "2026-06-01", "Amount": 1500.0, "Notes": "ESTIMATED historical entry \u2014 reconstructed from earliest observed deduction. Please verify/correct actual amount given and date."}, {"EmpID": "E104", "Name": "VIJENDRAN SURIYAPRAKASH", "Date": "2026-05-01", "Amount": 200.0, "Notes": "ESTIMATED historical entry \u2014 reconstructed from earliest observed deduction. Please verify/correct actual amount given and date. Still being recovered as of July \u2014 outstanding balance likely NOT fully known; confirm true original amount."}];
const SEED_PAYROLL = [{"Name": "RAMACHANDRAN BALAJI", "WorkedDays": 30.0, "OTHrsPrev": 69.0, "BasicForDays": 2225.806451612903, "FixedAllowForDays": 0.0, "OTPay": 828.0, "Gross": 3979.806451612903, "DedSp": 52.81, "DedOthsAdvance": 300.0, "NetSal": 3626.996451612903, "DedDort": null, "OtherAllowLump": 926.0, "Month": "2026-05-01", "EmpID": "E069"}, {"Name": "ABDULLAH ALPARMAAN", "WorkedDays": 31.0, "OTHrsPrev": null, "BasicForDays": 3900.0, "FixedAllowForDays": 0.0, "OTPay": null, "Gross": 3900.0, "DedSp": 39.5, "DedOthsAdvance": null, "NetSal": 3860.5, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-05-01", "EmpID": "E001"}, {"Name": "RAMAR SATHYAJOTHI", "WorkedDays": 31.0, "OTHrsPrev": 35.0, "BasicForDays": 1800.0, "FixedAllowForDays": 200.0, "OTPay": 175.0, "Gross": 3057.0, "DedSp": 34.86, "DedOthsAdvance": null, "NetSal": 3022.14, "DedDort": null, "OtherAllowLump": 882.0, "Month": "2026-05-01", "EmpID": "E072"}, {"Name": "MATHI ANTONY SIL KUPPER SINGH", "WorkedDays": 31.0, "OTHrsPrev": 80.0, "BasicForDays": 2000.0, "FixedAllowForDays": 200.0, "OTPay": 400.0, "Gross": 2934.0, "DedSp": 0.0, "DedOthsAdvance": 200.0, "NetSal": 2734.0, "DedDort": null, "OtherAllowLump": 334.0, "Month": "2026-05-01", "EmpID": "E046"}, {"Name": "SAMBANTHAMOORTHY SIVARAMAN", "WorkedDays": 31.0, "OTHrsPrev": 140.0, "BasicForDays": 1700.0, "FixedAllowForDays": 150.0, "OTPay": 700.0, "Gross": 2762.0, "DedSp": 52.81, "DedOthsAdvance": null, "NetSal": 2709.19, "DedDort": null, "OtherAllowLump": 212.0, "Month": "2026-05-01", "EmpID": "E079"}, {"Name": "KALIMUTHU SANKAR", "WorkedDays": 31.0, "OTHrsPrev": 113.0, "BasicForDays": 1150.0, "FixedAllowForDays": 100.0, "OTPay": 339.0, "Gross": 2555.4, "DedSp": 52.81, "DedOthsAdvance": null, "NetSal": 2502.59, "DedDort": null, "OtherAllowLump": 966.4, "Month": "2026-05-01", "EmpID": "E027"}, {"Name": "KUPPAN SABARIVASAN", "WorkedDays": 31.0, "OTHrsPrev": 37.0, "BasicForDays": 2000.0, "FixedAllowForDays": 200.0, "OTPay": 185.0, "Gross": 2513.0, "DedSp": 52.81, "DedOthsAdvance": null, "NetSal": 2460.19, "DedDort": null, "OtherAllowLump": 128.0, "Month": "2026-05-01", "EmpID": "E034"}, {"Name": "MAHARASAN KAJENDRAN", "WorkedDays": 31.0, "OTHrsPrev": 195.0, "BasicForDays": 1075.0, "FixedAllowForDays": 125.0, "OTPay": 975.0, "Gross": 2476.0, "DedSp": 52.6, "DedOthsAdvance": null, "NetSal": 2423.4, "DedDort": null, "OtherAllowLump": 301.0, "Month": "2026-05-01", "EmpID": "E037"}, {"Name": "ARUNACHALAM SANKAR", "WorkedDays": 31.0, "OTHrsPrev": 38.0, "BasicForDays": 1800.0, "FixedAllowForDays": 0.0, "OTPay": 114.0, "Gross": 2301.4, "DedSp": 52.81, "DedOthsAdvance": null, "NetSal": 2248.59, "DedDort": null, "OtherAllowLump": 387.4, "Month": "2026-05-01", "EmpID": "E008"}, {"Name": "ADHIMOOLAM GANESH", "WorkedDays": 31.0, "OTHrsPrev": 143.0, "BasicForDays": 1300.0, "FixedAllowForDays": 0.0, "OTPay": 715.0, "Gross": 2183.0, "DedSp": 39.36, "DedOthsAdvance": null, "NetSal": 2143.64, "DedDort": null, "OtherAllowLump": 168.0, "Month": "2026-05-01", "EmpID": "E003"}, {"Name": "PARAMASIVAM NATARAJAN", "WorkedDays": 31.0, "OTHrsPrev": 134.0, "BasicForDays": 1300.0, "FixedAllowForDays": 150.0, "OTPay": 670.0, "Gross": 2176.0, "DedSp": 39.36, "DedOthsAdvance": null, "NetSal": 2136.64, "DedDort": null, "OtherAllowLump": 56.0, "Month": "2026-05-01", "EmpID": "E060"}, {"Name": "SADAIYAN BALAMURUGAN", "WorkedDays": 31.0, "OTHrsPrev": 138.0, "BasicForDays": 1200.0, "FixedAllowForDays": 250.0, "OTPay": 552.0, "Gross": 2156.0, "DedSp": 34.86, "DedOthsAdvance": null, "NetSal": 2121.14, "DedDort": null, "OtherAllowLump": 154.0, "Month": "2026-05-01", "EmpID": "E077"}, {"Name": "BALASUBARAMANIYAN SIVAKUMAR", "WorkedDays": 29.0, "OTHrsPrev": 184.0, "BasicForDays": 1262.9032258064515, "FixedAllowForDays": 140.32258064516128, "OTPay": 736.0, "Gross": 2139.2258064516127, "DedSp": 34.86, "DedOthsAdvance": 200.0, "NetSal": 1904.3658064516126, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-05-01", "EmpID": "E011"}, {"Name": "RAMALINGAM PRASANTH", "WorkedDays": 27.0, "OTHrsPrev": 155.0, "BasicForDays": 984.1935483870968, "FixedAllowForDays": 496.4516129032258, "OTPay": 620.0, "Gross": 2100.645161290323, "DedSp": 3.8, "DedOthsAdvance": null, "NetSal": 2096.8451612903227, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-05-01", "EmpID": "E070"}, {"Name": "GURUNATHAN MURUGANANTHAM", "WorkedDays": 31.0, "OTHrsPrev": 82.0, "BasicForDays": 1100.0, "FixedAllowForDays": 200.0, "OTPay": 410.0, "Gross": 2094.0, "DedSp": 52.6, "DedOthsAdvance": null, "NetSal": 2041.4, "DedDort": null, "OtherAllowLump": 384.0, "Month": "2026-05-01", "EmpID": "E021"}, {"Name": "PADALA ANJINIKUMAR", "WorkedDays": 31.0, "OTHrsPrev": 223.5, "BasicForDays": 1000.0, "FixedAllowForDays": 150.0, "OTPay": 894.0, "Gross": 2074.0, "DedSp": 44.58, "DedOthsAdvance": 400.0, "NetSal": 1629.42, "DedDort": null, "OtherAllowLump": 30.0, "Month": "2026-05-01", "EmpID": "E054"}, {"Name": "RAJ VETHAMANICKAM", "WorkedDays": 31.0, "OTHrsPrev": 24.0, "BasicForDays": 1400.0, "FixedAllowForDays": 75.0, "OTPay": 72.0, "Gross": 2041.0, "DedSp": 52.81, "DedOthsAdvance": null, "NetSal": 1988.19, "DedDort": null, "OtherAllowLump": 494.0, "Month": "2026-05-01", "EmpID": "E066"}, {"Name": "THEKKEKARA PRADEEP", "WorkedDays": 31.0, "OTHrsPrev": 61.0, "BasicForDays": 1350.0, "FixedAllowForDays": 75.0, "OTPay": 183.0, "Gross": 2021.4, "DedSp": 52.6, "DedOthsAdvance": null, "NetSal": 1968.8000000000002, "DedDort": null, "OtherAllowLump": 413.4, "Month": "2026-05-01", "EmpID": "E094"}, {"Name": "RAMAYA MANIKANDAN", "WorkedDays": 31.0, "OTHrsPrev": 68.0, "BasicForDays": 980.0, "FixedAllowForDays": 230.0, "OTPay": 204.0, "Gross": 2005.0, "DedSp": 52.6, "DedOthsAdvance": null, "NetSal": 1952.4, "DedDort": null, "OtherAllowLump": 591.0, "Month": "2026-05-01", "EmpID": "E073"}, {"Name": "EMRAN E", "WorkedDays": 31.0, "OTHrsPrev": 41.0, "BasicForDays": 1500.0, "FixedAllowForDays": 0.0, "OTPay": 205.0, "Gross": 1992.0, "DedSp": 46.43, "DedOthsAdvance": null, "NetSal": 1945.57, "DedDort": null, "OtherAllowLump": 287.0, "Month": "2026-05-01", "EmpID": "E017"}, {"Name": "SIVARAMAN SUNDARAJAN", "WorkedDays": 31.0, "OTHrsPrev": 26.0, "BasicForDays": 1500.0, "FixedAllowForDays": 0.0, "OTPay": 130.0, "Gross": 1934.2, "DedSp": 36.43, "DedOthsAdvance": null, "NetSal": 1897.77, "DedDort": null, "OtherAllowLump": 304.2, "Month": "2026-05-01", "EmpID": "E087"}, {"Name": "MALAIRASU RAMARASU", "WorkedDays": 31.0, "OTHrsPrev": 218.0, "BasicForDays": 1100.0, "FixedAllowForDays": 150.0, "OTPay": 654.0, "Gross": 1904.0, "DedSp": 39.36, "DedOthsAdvance": null, "NetSal": 1864.64, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-05-01", "EmpID": "E039"}, {"Name": "GOVINDARAJ RAJIV", "WorkedDays": 31.0, "OTHrsPrev": 16.0, "BasicForDays": 1700.0, "FixedAllowForDays": 0.0, "OTPay": 48.0, "Gross": 1888.4, "DedSp": 44.58, "DedOthsAdvance": null, "NetSal": 1843.8200000000002, "DedDort": null, "OtherAllowLump": 140.4, "Month": "2026-05-01", "EmpID": "E020"}, {"Name": "KOOLAIAN SUBRAMANIAN", "WorkedDays": 31.0, "OTHrsPrev": 122.0, "BasicForDays": 1125.0, "FixedAllowForDays": 125.0, "OTPay": 488.0, "Gross": 1878.0, "DedSp": 34.86, "DedOthsAdvance": null, "NetSal": 1843.14, "DedDort": null, "OtherAllowLump": 140.0, "Month": "2026-05-01", "EmpID": "E033"}, {"Name": "SELVARAJ AJITH KUMAR", "WorkedDays": 31.0, "OTHrsPrev": 47.0, "BasicForDays": 700.0, "FixedAllowForDays": 500.0, "OTPay": 141.0, "Gross": 1822.0, "DedSp": 44.58, "DedOthsAdvance": null, "NetSal": 1777.42, "DedDort": null, "OtherAllowLump": 481.0, "Month": "2026-05-01", "EmpID": "E082"}, {"Name": "MARI KOTTAICHAMY", "WorkedDays": 31.0, "OTHrsPrev": 124.0, "BasicForDays": 1000.0, "FixedAllowForDays": 150.0, "OTPay": 496.0, "Gross": 1804.0, "DedSp": 34.86, "DedOthsAdvance": 200.0, "NetSal": 1569.1399999999999, "DedDort": null, "OtherAllowLump": 158.0, "Month": "2026-05-01", "EmpID": "E044"}, {"Name": "VENKATACHALAM SUDHAKAR", "WorkedDays": 31.0, "OTHrsPrev": 184.5, "BasicForDays": 950.0, "FixedAllowForDays": 250.0, "OTPay": 553.5, "Gross": 1753.5, "DedSp": 52.6, "DedOthsAdvance": null, "NetSal": 1700.9, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-05-01", "EmpID": "E103"}, {"Name": "JEYARAJ JANAGAR", "WorkedDays": 15.0, "OTHrsPrev": 74.0, "BasicForDays": 1137.0967741935485, "FixedAllowForDays": 0.0, "OTPay": 370.0, "Gross": 1742.0967741935485, "DedSp": 25.55, "DedOthsAdvance": null, "NetSal": 1716.5467741935486, "DedDort": null, "OtherAllowLump": 235.0, "Month": "2026-05-01", "EmpID": "E025"}, {"Name": "MANI KATHAVARAYAN", "WorkedDays": 31.0, "OTHrsPrev": 142.0, "BasicForDays": 900.0, "FixedAllowForDays": 100.0, "OTPay": 568.0, "Gross": 1726.0, "DedSp": 50.66, "DedOthsAdvance": null, "NetSal": 1675.34, "DedDort": null, "OtherAllowLump": 158.0, "Month": "2026-05-01", "EmpID": "E040"}, {"Name": "PANDI SANTHAKUMAR", "WorkedDays": 31.0, "OTHrsPrev": 140.0, "BasicForDays": 650.0, "FixedAllowForDays": 100.0, "OTPay": 420.0, "Gross": 1720.5, "DedSp": 52.6, "DedOthsAdvance": null, "NetSal": 1667.9, "DedDort": null, "OtherAllowLump": 550.5, "Month": "2026-05-01", "EmpID": "E058"}, {"Name": "THOMAS SIVA PRASAD", "WorkedDays": 31.0, "OTHrsPrev": 131.0, "BasicForDays": 900.0, "FixedAllowForDays": 0.0, "OTPay": 393.0, "Gross": 1705.0, "DedSp": 50.66, "DedOthsAdvance": 200.0, "NetSal": 1454.34, "DedDort": null, "OtherAllowLump": 412.0, "Month": "2026-05-01", "EmpID": "E096"}, {"Name": "SUDHAKAR BALASUBRAMANIAN", "WorkedDays": 31.0, "OTHrsPrev": 120.0, "BasicForDays": 1100.0, "FixedAllowForDays": 100.0, "OTPay": 480.0, "Gross": 1680.0, "DedSp": 46.43, "DedOthsAdvance": null, "NetSal": 1633.57, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-05-01", "EmpID": "E090"}, {"Name": "RAMAR MARISAN", "WorkedDays": 31.0, "OTHrsPrev": 62.0, "BasicForDays": 980.0, "FixedAllowForDays": 0.0, "OTPay": 186.0, "Gross": 1660.4, "DedSp": 52.6, "DedOthsAdvance": null, "NetSal": 1607.8000000000002, "DedDort": null, "OtherAllowLump": 494.4, "Month": "2026-05-01", "EmpID": "E071"}, {"Name": "VISWANATHAN ARUL", "WorkedDays": 31.0, "OTHrsPrev": 68.0, "BasicForDays": 750.0, "FixedAllowForDays": 250.0, "OTPay": 204.0, "Gross": 1657.6, "DedSp": 52.6, "DedOthsAdvance": null, "NetSal": 1605.0, "DedDort": null, "OtherAllowLump": 453.6, "Month": "2026-05-01", "EmpID": "E105"}, {"Name": "MEYYAPPAN MANIKANDAN", "WorkedDays": 31.0, "OTHrsPrev": 96.5, "BasicForDays": 1230.0, "FixedAllowForDays": 50.0, "OTPay": 289.5, "Gross": 1569.5, "DedSp": 52.6, "DedOthsAdvance": null, "NetSal": 1516.9, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-05-01", "EmpID": "E047"}, {"Name": "VEDIYAPPAN SISUKUMAR", "WorkedDays": 31.0, "OTHrsPrev": 36.5, "BasicForDays": 1200.0, "FixedAllowForDays": 0.0, "OTPay": 182.5, "Gross": 1528.5, "DedSp": 39.36, "DedOthsAdvance": null, "NetSal": 1489.14, "DedDort": null, "OtherAllowLump": 146.0, "Month": "2026-05-01", "EmpID": "E100"}, {"Name": "KARUPPIAH MEYAPPAN", "WorkedDays": 31.0, "OTHrsPrev": 90.0, "BasicForDays": 1100.0, "FixedAllowForDays": 50.0, "OTPay": 360.0, "Gross": 1510.0, "DedSp": 46.43, "DedOthsAdvance": null, "NetSal": 1463.57, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-05-01", "EmpID": "E031"}, {"Name": "RAVICHANDRAN PRAKASH", "WorkedDays": 31.0, "OTHrsPrev": 125.0, "BasicForDays": 750.0, "FixedAllowForDays": 0.0, "OTPay": 375.0, "Gross": 1459.0, "DedSp": 8.48, "DedOthsAdvance": null, "NetSal": 1450.52, "DedDort": null, "OtherAllowLump": 334.0, "Month": "2026-05-01", "EmpID": "E074"}, {"Name": "SHANMUGAVEL THIYAGARAJAN", "WorkedDays": 31.0, "OTHrsPrev": 44.0, "BasicForDays": 600.0, "FixedAllowForDays": 500.0, "OTPay": 176.0, "Gross": 1440.0, "DedSp": 50.66, "DedOthsAdvance": null, "NetSal": 1389.34, "DedDort": null, "OtherAllowLump": 164.0, "Month": "2026-05-01", "EmpID": "E086"}, {"Name": "KESAVAN NANDHEESWARAN", "WorkedDays": 31.0, "OTHrsPrev": 206.5, "BasicForDays": 700.0, "FixedAllowForDays": 100.0, "OTPay": 619.5, "Gross": 1419.5, "DedSp": 44.58, "DedOthsAdvance": null, "NetSal": 1374.92, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-05-01", "EmpID": "E032"}, {"Name": "CHELLADURAI SABARI RAJAN", "WorkedDays": 22.0, "OTHrsPrev": 180.3, "BasicForDays": 567.741935483871, "FixedAllowForDays": 141.93548387096774, "OTPay": 540.9000000000001, "Gross": 1418.5774193548389, "DedSp": 24.74, "DedOthsAdvance": null, "NetSal": 1393.8374193548389, "DedDort": null, "OtherAllowLump": 168.0, "Month": "2026-05-01", "EmpID": "E015"}, {"Name": "YENOSE JEYA MONOSE", "WorkedDays": 30.0, "OTHrsPrev": 98.0, "BasicForDays": 629.0322580645161, "FixedAllowForDays": 96.77419354838709, "OTPay": 294.0, "Gross": 1411.8064516129032, "DedSp": 50.66, "DedOthsAdvance": null, "NetSal": 1361.146451612903, "DedDort": null, "OtherAllowLump": 392.0, "Month": "2026-05-01", "EmpID": "E107"}, {"Name": "GANESAN MUTHUKUMAR", "WorkedDays": 30.0, "OTHrsPrev": 68.0, "BasicForDays": 774.1935483870967, "FixedAllowForDays": 96.77419354838709, "OTPay": 272.0, "Gross": 1397.967741935484, "DedSp": 52.6, "DedOthsAdvance": null, "NetSal": 1345.367741935484, "DedDort": null, "OtherAllowLump": 255.0, "Month": "2026-05-01", "EmpID": "E019"}, {"Name": "MANIKAVASAGAM MAHENDRAN", "WorkedDays": 30.0, "OTHrsPrev": 45.0, "BasicForDays": 774.1935483870967, "FixedAllowForDays": 96.77419354838709, "OTPay": 135.0, "Gross": 1362.467741935484, "DedSp": 52.6, "DedOthsAdvance": 200.0, "NetSal": 1109.867741935484, "DedDort": null, "OtherAllowLump": 356.5, "Month": "2026-05-01", "EmpID": "E043"}, {"Name": "MANIKANDAN MANOJ", "WorkedDays": 31.0, "OTHrsPrev": 194.5, "BasicForDays": 650.0, "FixedAllowForDays": 100.0, "OTPay": 583.5, "Gross": 1333.5, "DedSp": 46.43, "DedOthsAdvance": null, "NetSal": 1287.07, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-05-01", "EmpID": "E042"}, {"Name": "MUNIYAMUTHU   SUBRAMANIAN", "WorkedDays": 31.0, "OTHrsPrev": 28.0, "BasicForDays": 880.0, "FixedAllowForDays": 100.0, "OTPay": 84.0, "Gross": 1319.6, "DedSp": 34.86, "DedOthsAdvance": 300.0, "NetSal": 984.7399999999999, "DedDort": null, "OtherAllowLump": 255.6, "Month": "2026-05-01", "EmpID": "E049"}, {"Name": "VELUCHAMY BOOBALAN", "WorkedDays": 31.0, "OTHrsPrev": 61.0, "BasicForDays": 750.0, "FixedAllowForDays": 75.0, "OTPay": 183.0, "Gross": 1300.5, "DedSp": 44.58, "DedOthsAdvance": 200.0, "NetSal": 1055.92, "DedDort": null, "OtherAllowLump": 292.5, "Month": "2026-05-01", "EmpID": "E102"}, {"Name": "PAKKIRISAMY SATHYARAJ", "WorkedDays": 26.0, "OTHrsPrev": 155.0, "BasicForDays": 670.9677419354838, "FixedAllowForDays": 0.0, "OTPay": 465.0, "Gross": 1293.967741935484, "DedSp": 37.38, "DedOthsAdvance": 500.0, "NetSal": 756.5877419354839, "DedDort": null, "OtherAllowLump": 158.0, "Month": "2026-05-01", "EmpID": "E055"}, {"Name": "THANGARASU SAKTHIVEL", "WorkedDays": 31.0, "OTHrsPrev": 116.0, "BasicForDays": 800.0, "FixedAllowForDays": 0.0, "OTPay": 348.0, "Gross": 1286.0, "DedSp": 36.43, "DedOthsAdvance": 200.0, "NetSal": 1049.57, "DedDort": null, "OtherAllowLump": 138.0, "Month": "2026-05-01", "EmpID": "E093"}, {"Name": "PAZHANIYAPPAN AZHAGUMUTHU", "WorkedDays": 30.0, "OTHrsPrev": 50.5, "BasicForDays": 822.5806451612902, "FixedAllowForDays": 0.0, "OTPay": 202.0, "Gross": 1285.5806451612902, "DedSp": 36.43, "DedOthsAdvance": null, "NetSal": 1249.1506451612902, "DedDort": null, "OtherAllowLump": 261.0, "Month": "2026-05-01", "EmpID": "E062"}, {"Name": "SIVASANKARAN VIJAYAKUMAR", "WorkedDays": 31.0, "OTHrsPrev": 28.0, "BasicForDays": 980.0, "FixedAllowForDays": 0.0, "OTPay": 84.0, "Gross": 1273.5, "DedSp": 34.86, "DedOthsAdvance": 200.0, "NetSal": 1038.6399999999999, "DedDort": null, "OtherAllowLump": 209.5, "Month": "2026-05-01", "EmpID": "E088"}, {"Name": "SELVARAJ ARUN STALIN", "WorkedDays": 15.0, "OTHrsPrev": 80.0, "BasicForDays": 387.09677419354836, "FixedAllowForDays": 193.54838709677418, "OTPay": 320.0, "Gross": 1270.6451612903224, "DedSp": 44.58, "DedOthsAdvance": null, "NetSal": 1226.0651612903225, "DedDort": null, "OtherAllowLump": 370.0, "Month": "2026-05-01", "EmpID": "E083"}, {"Name": "PALANISAMY VIJYAKUMAR", "WorkedDays": 30.0, "OTHrsPrev": null, "BasicForDays": 1258.0645161290322, "FixedAllowForDays": 0.0, "OTPay": 0.0, "Gross": 1258.0645161290322, "DedSp": 39.5, "DedOthsAdvance": null, "NetSal": 1218.5645161290322, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-05-01", "EmpID": "E057"}, {"Name": "PRAKASH NITHISH", "WorkedDays": 31.0, "OTHrsPrev": 85.0, "BasicForDays": 1000.0, "FixedAllowForDays": 0.0, "OTPay": 255.0, "Gross": 1255.0, "DedSp": 52.81, "DedOthsAdvance": null, "NetSal": 1202.19, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-05-01", "EmpID": "E064"}, {"Name": "SAKTHIVEL SARGUNAM", "WorkedDays": 31.0, "OTHrsPrev": 38.0, "BasicForDays": 850.0, "FixedAllowForDays": 100.0, "OTPay": 114.0, "Gross": 1251.5, "DedSp": 44.58, "DedOthsAdvance": null, "NetSal": 1206.92, "DedDort": null, "OtherAllowLump": 187.5, "Month": "2026-05-01", "EmpID": "E078"}, {"Name": "ISLAM RAFIQUL", "WorkedDays": 31.0, "OTHrsPrev": 111.0, "BasicForDays": 750.0, "FixedAllowForDays": 0.0, "OTPay": 333.0, "Gross": 1229.0, "DedSp": 44.58, "DedOthsAdvance": null, "NetSal": 1184.42, "DedDort": null, "OtherAllowLump": 146.0, "Month": "2026-05-01", "EmpID": "E022"}, {"Name": "MOHAN SELVAMURUGAN", "WorkedDays": 31.0, "OTHrsPrev": 97.0, "BasicForDays": 700.0, "FixedAllowForDays": 200.0, "OTPay": 291.0, "Gross": 1221.0, "DedSp": 39.36, "DedOthsAdvance": null, "NetSal": 1181.64, "DedDort": null, "OtherAllowLump": 30.0, "Month": "2026-05-01", "EmpID": "E048"}, {"Name": "KAMBAN KANAGARAJ EMARSON RANJIT", "WorkedDays": 17.0, "OTHrsPrev": 119.0, "BasicForDays": 383.8709677419355, "FixedAllowForDays": 137.09677419354838, "OTPay": 476.0, "Gross": 1177.967741935484, "DedSp": 25.46, "DedOthsAdvance": 200.0, "NetSal": 952.5077419354839, "DedDort": null, "OtherAllowLump": 181.0, "Month": "2026-05-01", "EmpID": "E029"}, {"Name": "LAKSHMANAN VISWANATHAN", "WorkedDays": 30.0, "OTHrsPrev": 20.0, "BasicForDays": 580.6451612903226, "FixedAllowForDays": 145.16129032258064, "OTPay": 60.0, "Gross": 1148.8064516129032, "DedSp": 36.43, "DedOthsAdvance": null, "NetSal": 1112.376451612903, "DedDort": null, "OtherAllowLump": 363.0, "Month": "2026-05-01", "EmpID": "E036"}, {"Name": "VIJENDRAN SURIYAPRAKASH", "WorkedDays": 30.0, "OTHrsPrev": 106.0, "BasicForDays": 629.0322580645161, "FixedAllowForDays": 0.0, "OTPay": 318.0, "Gross": 1107.032258064516, "DedSp": 50.66, "DedOthsAdvance": 200.0, "NetSal": 856.3722580645161, "DedDort": null, "OtherAllowLump": 160.0, "Month": "2026-05-01", "EmpID": "E104"}, {"Name": "RAJA ASWIN", "WorkedDays": 31.0, "OTHrsPrev": 52.0, "BasicForDays": 500.0, "FixedAllowForDays": 300.0, "OTPay": 156.0, "Gross": 1069.0, "DedSp": 34.86, "DedOthsAdvance": 200.0, "NetSal": 834.14, "DedDort": null, "OtherAllowLump": 113.0, "Month": "2026-05-01", "EmpID": "E067"}, {"Name": "SENTHILKUMAR VISWANATHAN", "WorkedDays": 31.0, "OTHrsPrev": 151.0, "BasicForDays": 600.0, "FixedAllowForDays": 0.0, "OTPay": 453.0, "Gross": 1053.0, "DedSp": 36.43, "DedOthsAdvance": null, "NetSal": 1016.57, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-05-01", "EmpID": "E085"}, {"Name": "RAJARAMAN SANTHOSHKUMAR", "WorkedDays": 30.0, "OTHrsPrev": 124.0, "BasicForDays": 532.258064516129, "FixedAllowForDays": 96.77419354838709, "OTPay": 372.0, "Gross": 1001.0322580645161, "DedSp": 50.66, "DedOthsAdvance": null, "NetSal": 950.3722580645161, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-05-01", "EmpID": "E068"}, {"Name": "WILLIAM JAYARAJ ANTHONY JAMES", "WorkedDays": 31.0, "OTHrsPrev": 77.0, "BasicForDays": 750.0, "FixedAllowForDays": 0.0, "OTPay": 231.0, "Gross": 981.0, "DedSp": 36.43, "DedOthsAdvance": null, "NetSal": 944.57, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-05-01", "EmpID": "E106"}, {"Name": "ALAGARSAN UDHAYANITHI", "WorkedDays": 31.0, "OTHrsPrev": 76.0, "BasicForDays": 600.0, "FixedAllowForDays": 0.0, "OTPay": 228.0, "Gross": 970.0, "DedSp": 50.66, "DedOthsAdvance": null, "NetSal": 919.34, "DedDort": null, "OtherAllowLump": 142.0, "Month": "2026-05-01", "EmpID": "E005"}, {"Name": "KALAYARASAN AKASH", "WorkedDays": 31.0, "OTHrsPrev": 123.0, "BasicForDays": 600.0, "FixedAllowForDays": 0.0, "OTPay": 369.0, "Gross": 969.0, "DedSp": 46.43, "DedOthsAdvance": null, "NetSal": 922.57, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-05-01", "EmpID": "E026"}, {"Name": "PALANISAMY ABILASH", "WorkedDays": 31.0, "OTHrsPrev": 100.0, "BasicForDays": 650.0, "FixedAllowForDays": 0.0, "OTPay": 300.0, "Gross": 950.0, "DedSp": 34.86, "DedOthsAdvance": null, "NetSal": 915.14, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-05-01", "EmpID": "E056"}, {"Name": "SENTHILKUMAR POOVARASAN", "WorkedDays": 30.0, "OTHrsPrev": 122.0, "BasicForDays": 580.6451612903226, "FixedAllowForDays": 0.0, "OTPay": 366.0, "Gross": 946.6451612903226, "DedSp": 36.43, "DedOthsAdvance": null, "NetSal": 910.2151612903226, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-05-01", "EmpID": "E084"}, {"Name": "BOSE PARTHIBAN", "WorkedDays": 31.0, "OTHrsPrev": 10.0, "BasicForDays": 600.0, "FixedAllowForDays": 100.0, "OTPay": 30.0, "Gross": 942.0, "DedSp": 50.66, "DedOthsAdvance": null, "NetSal": 891.34, "DedDort": null, "OtherAllowLump": 212.0, "Month": "2026-05-01", "EmpID": "E014"}, {"Name": "ISLAM SIFUL", "WorkedDays": 31.0, "OTHrsPrev": 18.0, "BasicForDays": 800.0, "FixedAllowForDays": 50.0, "OTPay": 72.0, "Gross": 939.2, "DedSp": 46.43, "DedOthsAdvance": null, "NetSal": 892.7700000000001, "DedDort": null, "OtherAllowLump": 17.2, "Month": "2026-05-01", "EmpID": "E023"}, {"Name": "THINESH VISHVA", "WorkedDays": 31.0, "OTHrsPrev": 106.0, "BasicForDays": 600.0, "FixedAllowForDays": 0.0, "OTPay": 318.0, "Gross": 918.0, "DedSp": 46.43, "DedOthsAdvance": null, "NetSal": 871.57, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-05-01", "EmpID": "E095"}, {"Name": "SANKAR ALAGUMANIKANDAN", "WorkedDays": 31.0, "OTHrsPrev": 89.0, "BasicForDays": 650.0, "FixedAllowForDays": 0.0, "OTPay": 267.0, "Gross": 917.0, "DedSp": 36.43, "DedOthsAdvance": null, "NetSal": 880.57, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-05-01", "EmpID": "E081"}, {"Name": "KALYANASUNDARAM KARTHIKEYAN", "WorkedDays": 31.0, "OTHrsPrev": 80.0, "BasicForDays": 600.0, "FixedAllowForDays": 0.0, "OTPay": 240.0, "Gross": 915.0, "DedSp": 46.43, "DedOthsAdvance": null, "NetSal": 868.57, "DedDort": null, "OtherAllowLump": 75.0, "Month": "2026-05-01", "EmpID": "E028"}, {"Name": "RENGARAJ ELAVARASAN", "WorkedDays": 31.0, "OTHrsPrev": 102.0, "BasicForDays": 600.0, "FixedAllowForDays": 0.0, "OTPay": 306.0, "Gross": 912.0, "DedSp": 52.6, "DedOthsAdvance": null, "NetSal": 859.4, "DedDort": null, "OtherAllowLump": 6.0, "Month": "2026-05-01", "EmpID": "E076"}, {"Name": "MURUGESAN SARAVANAN", "WorkedDays": 5.0, "OTHrsPrev": 150.0, "BasicForDays": 153.2258064516129, "FixedAllowForDays": 0.0, "OTPay": 600.0, "Gross": 910.2258064516129, "DedSp": 8.17, "DedOthsAdvance": null, "NetSal": 902.055806451613, "DedDort": null, "OtherAllowLump": 157.0, "Month": "2026-05-01", "EmpID": "E051"}, {"Name": "MARIYAPPAN SABARIRAJAN", "WorkedDays": 30.0, "OTHrsPrev": 40.0, "BasicForDays": 677.4193548387098, "FixedAllowForDays": 0.0, "OTPay": 120.0, "Gross": 903.4193548387098, "DedSp": 36.43, "DedOthsAdvance": null, "NetSal": 866.9893548387098, "DedDort": null, "OtherAllowLump": 106.0, "Month": "2026-05-01", "EmpID": "E045"}, {"Name": "NATARAJAN SAKTHIJANARTHANAN", "WorkedDays": 4.0, "OTHrsPrev": 78.0, "BasicForDays": 169.03225806451613, "FixedAllowForDays": 6.451612903225806, "OTPay": 234.0, "Gross": 895.483870967742, "DedSp": null, "DedOthsAdvance": 250.0, "NetSal": 645.483870967742, "DedDort": null, "OtherAllowLump": 486.0, "Month": "2026-05-01", "EmpID": "E053"}, {"Name": "BALASUBRAMANIAN PRAVEEN", "WorkedDays": 30.0, "OTHrsPrev": 103.0, "BasicForDays": 580.6451612903226, "FixedAllowForDays": 0.0, "OTPay": 309.0, "Gross": 889.6451612903226, "DedSp": 34.86, "DedOthsAdvance": null, "NetSal": 854.7851612903225, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-05-01", "EmpID": "E012"}, {"Name": "JAYARAMAN BASKAR", "WorkedDays": 31.0, "OTHrsPrev": 11.0, "BasicForDays": 850.0, "FixedAllowForDays": 0.0, "OTPay": 33.0, "Gross": 883.0, "DedSp": 36.43, "DedOthsAdvance": null, "NetSal": 846.57, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-05-01", "EmpID": "E024"}, {"Name": "KARUPPIAH CHANDRAN", "WorkedDays": 31.0, "OTHrsPrev": 42.5, "BasicForDays": 650.0, "FixedAllowForDays": 100.0, "OTPay": 127.5, "Gross": 881.0, "DedSp": 44.58, "DedOthsAdvance": null, "NetSal": 836.42, "DedDort": null, "OtherAllowLump": 3.5, "Month": "2026-05-01", "EmpID": "E030"}, {"Name": "AROCKIYARAJ ISEN", "WorkedDays": 30.0, "OTHrsPrev": 100.0, "BasicForDays": 580.6451612903226, "FixedAllowForDays": 0.0, "OTPay": 300.0, "Gross": 880.6451612903226, "DedSp": 36.43, "DedOthsAdvance": null, "NetSal": 844.2151612903226, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-05-01", "EmpID": "E007"}, {"Name": "BERCHMANS JOEL", "WorkedDays": 30.0, "OTHrsPrev": null, "BasicForDays": 822.5806451612902, "FixedAllowForDays": 0.0, "OTPay": null, "Gross": 822.5806451612902, "DedSp": 34.86, "DedOthsAdvance": null, "NetSal": 787.7206451612902, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-05-01", "EmpID": "E013"}, {"Name": "SANDRANU SAI NAGENDRA", "WorkedDays": 31.0, "OTHrsPrev": 10.5, "BasicForDays": 750.0, "FixedAllowForDays": 0.0, "OTPay": 31.5, "Gross": 811.5, "DedSp": 39.36, "DedOthsAdvance": null, "NetSal": 772.14, "DedDort": null, "OtherAllowLump": 30.0, "Month": "2026-05-01", "EmpID": "E080"}, {"Name": "SUBBAIAH PRABU", "WorkedDays": 30.0, "OTHrsPrev": 89.0, "BasicForDays": 532.258064516129, "FixedAllowForDays": 0.0, "OTPay": 267.0, "Gross": 799.258064516129, "DedSp": 44.58, "DedOthsAdvance": null, "NetSal": 754.678064516129, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-05-01", "EmpID": "E089"}, {"Name": "PAUL APU", "WorkedDays": 31.0, "OTHrsPrev": 56.0, "BasicForDays": 600.0, "FixedAllowForDays": 0.0, "OTPay": 168.0, "Gross": 771.6, "DedSp": 44.58, "DedOthsAdvance": null, "NetSal": 727.02, "DedDort": null, "OtherAllowLump": 3.6, "Month": "2026-05-01", "EmpID": "E061"}, {"Name": "ANTHONY RAJ SATHRAK RAJA", "WorkedDays": 31.0, "OTHrsPrev": 70.0, "BasicForDays": 550.0, "FixedAllowForDays": 0.0, "OTPay": 210.0, "Gross": 760.0, "DedSp": 46.43, "DedOthsAdvance": null, "NetSal": 713.57, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-05-01", "EmpID": "E006"}, {"Name": "VASUDEVAN GOPINATH", "WorkedDays": 30.0, "OTHrsPrev": 13.0, "BasicForDays": 580.6451612903226, "FixedAllowForDays": 0.0, "OTPay": 39.0, "Gross": 705.6451612903226, "DedSp": 50.66, "DedOthsAdvance": null, "NetSal": 654.9851612903226, "DedDort": null, "OtherAllowLump": 86.0, "Month": "2026-05-01", "EmpID": "E099"}, {"Name": "MURUGAN DHINESH", "WorkedDays": 31.0, "OTHrsPrev": 33.0, "BasicForDays": 600.0, "FixedAllowForDays": 0.0, "OTPay": 99.0, "Gross": 699.0, "DedSp": 36.43, "DedOthsAdvance": null, "NetSal": 662.57, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-05-01", "EmpID": "E050"}, {"Name": "VAGISAN VASANTHAN", "WorkedDays": 31.0, "OTHrsPrev": 26.0, "BasicForDays": 600.0, "FixedAllowForDays": 0.0, "OTPay": 78.0, "Gross": 678.0, "DedSp": 36.43, "DedOthsAdvance": null, "NetSal": 641.57, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-05-01", "EmpID": "E098"}, {"Name": "MUTHUKUMARASAMY  KAVITHASAN", "WorkedDays": 31.0, "OTHrsPrev": null, "BasicForDays": 650.0, "FixedAllowForDays": 0.0, "OTPay": null, "Gross": 650.0, "DedSp": null, "DedOthsAdvance": null, "NetSal": 650.0, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-05-01", "EmpID": "E052"}, {"Name": "PRAKASH PRAVEEN RAJ", "WorkedDays": 30.0, "OTHrsPrev": 0.0, "BasicForDays": 629.0322580645161, "FixedAllowForDays": 0.0, "OTPay": 0.0, "Gross": 629.0322580645161, "DedSp": 46.43, "DedOthsAdvance": null, "NetSal": 582.6022580645161, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-05-01", "EmpID": "E065"}, {"Name": "AKKINIRAJA BHARATH SANJAY", "WorkedDays": 30.0, "OTHrsPrev": null, "BasicForDays": 629.0322580645161, "FixedAllowForDays": 0.0, "OTPay": null, "Gross": 629.0322580645161, "DedSp": 46.43, "DedOthsAdvance": null, "NetSal": 582.6022580645161, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-05-01", "EmpID": "E004"}, {"Name": "PERUMAL MOORTHY", "WorkedDays": 4.0, "OTHrsPrev": 75.0, "BasicForDays": 141.93548387096774, "FixedAllowForDays": 12.903225806451612, "OTPay": 300.0, "Gross": 592.8387096774194, "DedSp": 4.5, "DedOthsAdvance": null, "NetSal": 588.3387096774194, "DedDort": null, "OtherAllowLump": 138.0, "Month": "2026-05-01", "EmpID": "E063"}, {"Name": "ARUNAGIRI KANNAN", "WorkedDays": 0.0, "OTHrsPrev": 119.0, "BasicForDays": 0.0, "FixedAllowForDays": 0.0, "OTPay": 357.0, "Gross": 519.0, "DedSp": 0.0, "DedOthsAdvance": null, "NetSal": 519.0, "DedDort": null, "OtherAllowLump": 162.0, "Month": "2026-05-01", "EmpID": "E009"}, {"Name": "THURAIPANDIYAN JEYAKUMAR", "WorkedDays": 0.0, "OTHrsPrev": 56.0, "BasicForDays": 0.0, "FixedAllowForDays": 0.0, "OTPay": 168.0, "Gross": 421.5, "DedSp": 0.0, "DedOthsAdvance": null, "NetSal": 421.5, "DedDort": null, "OtherAllowLump": 253.5, "Month": "2026-05-01", "EmpID": "E097"}, {"Name": "ASHOKKUMAR SRI VENKATESHWARA", "WorkedDays": 3.0, "OTHrsPrev": 88.0, "BasicForDays": 53.225806451612904, "FixedAllowForDays": 0.0, "OTPay": 264.0, "Gross": 317.2258064516129, "DedSp": 4.49, "DedOthsAdvance": null, "NetSal": 312.7358064516129, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-05-01", "EmpID": "E010"}, {"Name": "PANNER SELVAM SATHIS", "WorkedDays": 5.0, "OTHrsPrev": 10.0, "BasicForDays": 129.03225806451613, "FixedAllowForDays": 0.0, "OTPay": 30.0, "Gross": 299.0322580645161, "DedSp": 8.17, "DedOthsAdvance": null, "NetSal": 290.8622580645161, "DedDort": null, "OtherAllowLump": 140.0, "Month": "2026-05-01", "EmpID": "E059"}, {"Name": "TAMILARASAN DINESHKUMAR", "WorkedDays": 0.0, "OTHrsPrev": 80.0, "BasicForDays": 0.0, "FixedAllowForDays": 0.0, "OTPay": 240.0, "Gross": 240.0, "DedSp": 0.0, "DedOthsAdvance": null, "NetSal": 240.0, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-05-01", "EmpID": "E091"}, {"Name": "GAJENDRAN DHIVAKARAN", "WorkedDays": 2.0, "OTHrsPrev": 16.0, "BasicForDays": 62.903225806451616, "FixedAllowForDays": 4.838709677419355, "OTPay": 48.0, "Gross": 225.74193548387098, "DedSp": 2.25, "DedOthsAdvance": null, "NetSal": 223.49193548387098, "DedDort": null, "OtherAllowLump": 110.0, "Month": "2026-05-01", "EmpID": "E018"}, {"Name": "VELCY ARUL ANAND BRITTO", "WorkedDays": null, "OTHrsPrev": null, "BasicForDays": 0.0, "FixedAllowForDays": 0.0, "OTPay": 0.0, "Gross": 0.0, "DedSp": null, "DedOthsAdvance": null, "NetSal": 0.0, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-05-01", "EmpID": "E101"}, {"Name": "ABDULLAH ALPARMAAN", "WorkedDays": 30.0, "OTHrsPrev": null, "BasicForDays": 3900.0, "FixedAllowForDays": 0.0, "OTPay": null, "Gross": 3980.0, "DedSp": 39.36, "DedOthsAdvance": null, "NetSal": 3940.64, "DedDort": null, "OtherAllowLump": 80.0, "Month": "2026-06-01", "EmpID": "E001"}, {"Name": "RAMAR SATHYAJOTHI", "WorkedDays": 30.0, "OTHrsPrev": null, "BasicForDays": 1800.0, "FixedAllowForDays": 200.0, "OTPay": 0.0, "Gross": 3452.0, "DedSp": null, "DedOthsAdvance": null, "NetSal": 3433.25, "DedDort": 18.75, "OtherAllowLump": 1452.0, "Month": "2026-06-01", "EmpID": "E072"}, {"Name": "RAMACHANDRAN BALAJI", "WorkedDays": 30.0, "OTHrsPrev": 16.0, "BasicForDays": 2300.0, "FixedAllowForDays": 0.0, "OTPay": 192.0, "Gross": 3192.0, "DedSp": 58.88, "DedOthsAdvance": 300.0, "NetSal": 2833.12, "DedDort": null, "OtherAllowLump": 700.0, "Month": "2026-06-01", "EmpID": "E069"}, {"Name": "MATHI ANTONY SIL KUPPER SINGH", "WorkedDays": 30.0, "OTHrsPrev": 67.0, "BasicForDays": 2000.0000000000002, "FixedAllowForDays": 200.0, "OTPay": 335.0, "Gross": 2785.8, "DedSp": null, "DedOthsAdvance": 200.0, "NetSal": 2585.8, "DedDort": null, "OtherAllowLump": 250.8, "Month": "2026-06-01", "EmpID": "E046"}, {"Name": "KUPPAN SABARIVASAN", "WorkedDays": 30.0, "OTHrsPrev": 44.0, "BasicForDays": 2000.0000000000002, "FixedAllowForDays": 200.0, "OTPay": 220.0, "Gross": 2517.0, "DedSp": 58.88, "DedOthsAdvance": null, "NetSal": 2458.12, "DedDort": null, "OtherAllowLump": 97.0, "Month": "2026-06-01", "EmpID": "E034"}, {"Name": "KALIMUTHU SANKAR", "WorkedDays": 30.0, "OTHrsPrev": 185.0, "BasicForDays": 1150.0, "FixedAllowForDays": 100.0, "OTPay": 555.0, "Gross": 2468.6, "DedSp": 58.88, "DedOthsAdvance": null, "NetSal": 2409.72, "DedDort": null, "OtherAllowLump": 663.6, "Month": "2026-06-01", "EmpID": "E027"}, {"Name": "EMRAN E", "WorkedDays": 30.0, "OTHrsPrev": 34.0, "BasicForDays": 1500.0, "FixedAllowForDays": 0.0, "OTPay": 170.0, "Gross": 2450.0, "DedSp": 51.19, "DedOthsAdvance": null, "NetSal": 2385.48, "DedDort": 13.33, "OtherAllowLump": 780.0, "Month": "2026-06-01", "EmpID": "E017"}, {"Name": "GOVINDARAJ RAJIV", "WorkedDays": 30.0, "OTHrsPrev": 166.0, "BasicForDays": 1700.0, "FixedAllowForDays": 0.0, "OTPay": 498.0, "Gross": 2224.2, "DedSp": 55.89, "DedOthsAdvance": 490.0, "NetSal": 1678.31, "DedDort": null, "OtherAllowLump": 26.2, "Month": "2026-06-01", "EmpID": "E020"}, {"Name": "THEKKEKARA PRADEEP", "WorkedDays": 30.0, "OTHrsPrev": 56.0, "BasicForDays": 1350.0, "FixedAllowForDays": 75.0, "OTPay": 168.0, "Gross": 2206.8, "DedSp": 69.04, "DedOthsAdvance": null, "NetSal": 2119.01, "DedDort": 18.75, "OtherAllowLump": 613.8, "Month": "2026-06-01", "EmpID": "E094"}, {"Name": "ARUNACHALAM SANKAR", "WorkedDays": 30.0, "OTHrsPrev": 20.0, "BasicForDays": 1800.0, "FixedAllowForDays": 0.0, "OTPay": 60.0, "Gross": 2200.4, "DedSp": 58.88, "DedOthsAdvance": null, "NetSal": 2141.52, "DedDort": null, "OtherAllowLump": 340.4, "Month": "2026-06-01", "EmpID": "E008"}, {"Name": "SAMBANTHAMOORTHY SIVARAMAN", "WorkedDays": 30.0, "OTHrsPrev": 38.0, "BasicForDays": 1700.0, "FixedAllowForDays": 150.0, "OTPay": 190.0, "Gross": 2181.0, "DedSp": 58.88, "DedOthsAdvance": null, "NetSal": 2122.12, "DedDort": null, "OtherAllowLump": 141.0, "Month": "2026-06-01", "EmpID": "E079"}, {"Name": "SIVARAMAN SUNDARAJAN", "WorkedDays": 30.0, "OTHrsPrev": 44.0, "BasicForDays": 1500.0, "FixedAllowForDays": 0.0, "OTPay": 220.0, "Gross": 2151.8, "DedSp": 39.21, "DedOthsAdvance": null, "NetSal": 2112.59, "DedDort": null, "OtherAllowLump": 431.8, "Month": "2026-06-01", "EmpID": "E087"}, {"Name": "PADALA ANJINIKUMAR", "WorkedDays": 30.0, "OTHrsPrev": 228.0, "BasicForDays": 1000.0000000000001, "FixedAllowForDays": 150.0, "OTPay": 912.0, "Gross": 2062.0, "DedSp": 55.89, "DedOthsAdvance": 400.0, "NetSal": 1606.1100000000001, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-06-01", "EmpID": "E054"}, {"Name": "BALASUBARAMANIYAN SIVAKUMAR", "WorkedDays": 30.0, "OTHrsPrev": 130.5, "BasicForDays": 1350.0, "FixedAllowForDays": 150.0, "OTPay": 522.0, "Gross": 2051.8, "DedSp": 29.3, "DedOthsAdvance": 200.0, "NetSal": 1803.7500000000002, "DedDort": 18.75, "OtherAllowLump": 29.8, "Month": "2026-06-01", "EmpID": "E011"}, {"Name": "RAJ VETHAMANICKAM", "WorkedDays": 30.0, "OTHrsPrev": 50.0, "BasicForDays": 1400.0, "FixedAllowForDays": 75.0, "OTPay": 150.0, "Gross": 2032.5, "DedSp": 58.88, "DedOthsAdvance": null, "NetSal": 1973.62, "DedDort": null, "OtherAllowLump": 407.5, "Month": "2026-06-01", "EmpID": "E066"}, {"Name": "THOMAS SIVA PRASAD", "WorkedDays": 30.0, "OTHrsPrev": 144.0, "BasicForDays": 900.0, "FixedAllowForDays": 0.0, "OTPay": 432.0, "Gross": 1969.0, "DedSp": 50.64, "DedOthsAdvance": 200.0, "NetSal": 1711.21, "DedDort": 7.15, "OtherAllowLump": 637.0, "Month": "2026-06-01", "EmpID": "E096"}, {"Name": "RAVICHANDRAN SRIRAM", "WorkedDays": 30.0, "OTHrsPrev": null, "BasicForDays": 1100.0, "FixedAllowForDays": 200.0, "OTPay": 0.0, "Gross": 1936.0, "DedSp": 58.88, "DedOthsAdvance": 700.0, "NetSal": 1177.12, "DedDort": null, "OtherAllowLump": 636.0, "Month": "2026-06-01", "EmpID": "E075"}, {"Name": "GURUNATHAN MURUGANANTHAM", "WorkedDays": 30.0, "OTHrsPrev": 9.0, "BasicForDays": 1100.0, "FixedAllowForDays": 200.0, "OTPay": 45.0, "Gross": 1892.0, "DedSp": 69.04, "DedOthsAdvance": null, "NetSal": 1804.21, "DedDort": 18.75, "OtherAllowLump": 547.0, "Month": "2026-06-01", "EmpID": "E021"}, {"Name": "PARAMASIVAM NATARAJAN", "WorkedDays": 30.0, "OTHrsPrev": 82.0, "BasicForDays": 1300.0, "FixedAllowForDays": 150.0, "OTPay": 410.0, "Gross": 1890.0, "DedSp": 39.36, "DedOthsAdvance": null, "NetSal": 1850.64, "DedDort": null, "OtherAllowLump": 30.0, "Month": "2026-06-01", "EmpID": "E060"}, {"Name": "PANDI SANTHAKUMAR", "WorkedDays": 30.0, "OTHrsPrev": 164.0, "BasicForDays": 650.0, "FixedAllowForDays": 100.0, "OTPay": 492.0, "Gross": 1865.5, "DedSp": 69.04, "DedOthsAdvance": null, "NetSal": 1777.71, "DedDort": 18.75, "OtherAllowLump": 623.5, "Month": "2026-06-01", "EmpID": "E058"}, {"Name": "VISWANATHAN ARUL", "WorkedDays": 30.0, "OTHrsPrev": 68.0, "BasicForDays": 750.0, "FixedAllowForDays": 250.00000000000003, "OTPay": 204.0, "Gross": 1849.0, "DedSp": 47.77, "DedOthsAdvance": null, "NetSal": 1801.23, "DedDort": null, "OtherAllowLump": 645.0, "Month": "2026-06-01", "EmpID": "E105"}, {"Name": "MEYYAPPAN MANIKANDAN", "WorkedDays": 28.0, "OTHrsPrev": 182.0, "BasicForDays": 1148.0, "FixedAllowForDays": 46.66666666666667, "OTPay": 546.0, "Gross": 1740.6666666666667, "DedSp": 41.42, "DedOthsAdvance": null, "NetSal": 1680.4966666666667, "DedDort": 18.75, "OtherAllowLump": 0.0, "Month": "2026-06-01", "EmpID": "E047"}, {"Name": "SADAIYAN BALAMURUGAN", "WorkedDays": 28.0, "OTHrsPrev": 65.0, "BasicForDays": 1120.0, "FixedAllowForDays": 233.33333333333334, "OTPay": 260.0, "Gross": 1729.3333333333333, "DedSp": 29.3, "DedOthsAdvance": null, "NetSal": 1681.2833333333333, "DedDort": 18.75, "OtherAllowLump": 116.0, "Month": "2026-06-01", "EmpID": "E077"}, {"Name": "MALAIRASU RAMARASU", "WorkedDays": 30.0, "OTHrsPrev": 157.5, "BasicForDays": 1100.0, "FixedAllowForDays": 150.0, "OTPay": 472.5, "Gross": 1722.5, "DedSp": 39.36, "DedOthsAdvance": 500.0, "NetSal": 1183.1399999999999, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-06-01", "EmpID": "E039"}, {"Name": "RAMAR MARISAN", "WorkedDays": 30.0, "OTHrsPrev": 32.0, "BasicForDays": 979.9999999999999, "FixedAllowForDays": 0.0, "OTPay": 96.0, "Gross": 1637.0, "DedSp": 69.04, "DedOthsAdvance": null, "NetSal": 1549.21, "DedDort": 18.75, "OtherAllowLump": 561.0, "Month": "2026-06-01", "EmpID": "E071"}, {"Name": "PALANISAMY VIJYAKUMAR", "WorkedDays": 30.0, "OTHrsPrev": 61.5, "BasicForDays": 1258.0645161290322, "FixedAllowForDays": 0.0, "OTPay": 246.0, "Gross": 1548.0645161290322, "DedSp": null, "DedOthsAdvance": null, "NetSal": 1548.0645161290322, "DedDort": null, "OtherAllowLump": 44.0, "Month": "2026-06-01", "EmpID": "E057"}, {"Name": "KOOLAIAN SUBRAMANIAN", "WorkedDays": 29.0, "OTHrsPrev": 52.0, "BasicForDays": 1087.5, "FixedAllowForDays": 120.83333333333334, "OTPay": 208.0, "Gross": 1544.3333333333333, "DedSp": 29.3, "DedOthsAdvance": null, "NetSal": 1496.2833333333333, "DedDort": 18.75, "OtherAllowLump": 128.0, "Month": "2026-06-01", "EmpID": "E033"}, {"Name": "MAHARASAN KAJENDRAN", "WorkedDays": 30.0, "OTHrsPrev": 41.0, "BasicForDays": 1075.0, "FixedAllowForDays": 125.00000000000001, "OTPay": 205.0, "Gross": 1525.0, "DedSp": 69.04, "DedOthsAdvance": null, "NetSal": 1437.21, "DedDort": 18.75, "OtherAllowLump": 120.0, "Month": "2026-06-01", "EmpID": "E037"}, {"Name": "KARUPPIAH MEYAPPAN", "WorkedDays": 30.0, "OTHrsPrev": 92.0, "BasicForDays": 1100.0, "FixedAllowForDays": 50.0, "OTPay": 368.0, "Gross": 1518.0, "DedSp": 51.19, "DedOthsAdvance": null, "NetSal": 1453.48, "DedDort": 13.33, "OtherAllowLump": 0.0, "Month": "2026-06-01", "EmpID": "E031"}, {"Name": "VEDIYAPPAN SISUKUMAR", "WorkedDays": 30.0, "OTHrsPrev": 30.0, "BasicForDays": 1200.0, "FixedAllowForDays": 0.0, "OTPay": 150.0, "Gross": 1516.0, "DedSp": 39.36, "DedOthsAdvance": null, "NetSal": 1476.64, "DedDort": null, "OtherAllowLump": 166.0, "Month": "2026-06-01", "EmpID": "E100"}, {"Name": "VENKATACHALAM SUDHAKAR", "WorkedDays": 25.0, "OTHrsPrev": 171.0, "BasicForDays": 791.6666666666667, "FixedAllowForDays": 208.33333333333334, "OTPay": 513.0, "Gross": 1513.0, "DedSp": 36.98, "DedOthsAdvance": 1500.0, "NetSal": -42.73000000000002, "DedDort": 18.75, "OtherAllowLump": -0.0, "Month": "2026-06-01", "EmpID": "E103"}, {"Name": "SIVASANKARAN VIJAYAKUMAR", "WorkedDays": 30.0, "OTHrsPrev": 89.0, "BasicForDays": 979.9999999999999, "FixedAllowForDays": 0.0, "OTPay": 267.0, "Gross": 1473.5, "DedSp": 29.3, "DedOthsAdvance": 200.0, "NetSal": 1225.45, "DedDort": 18.75, "OtherAllowLump": 226.5, "Month": "2026-06-01", "EmpID": "E088"}, {"Name": "MARI KOTTAICHAMY", "WorkedDays": 30.0, "OTHrsPrev": 56.0, "BasicForDays": 1000.0000000000001, "FixedAllowForDays": 150.0, "OTPay": 224.0, "Gross": 1470.0, "DedSp": 29.3, "DedOthsAdvance": 200.0, "NetSal": 1221.95, "DedDort": 18.75, "OtherAllowLump": 96.0, "Month": "2026-06-01", "EmpID": "E044"}, {"Name": "MUNIYAMUTHU   SUBRAMANIAN", "WorkedDays": 30.0, "OTHrsPrev": 66.0, "BasicForDays": 880.0, "FixedAllowForDays": 100.0, "OTPay": 198.0, "Gross": 1467.8, "DedSp": 29.3, "DedOthsAdvance": null, "NetSal": 1419.75, "DedDort": 18.75, "OtherAllowLump": 289.8, "Month": "2026-06-01", "EmpID": "E049"}, {"Name": "SUDHAKAR BALASUBRAMANIAN", "WorkedDays": 30.0, "OTHrsPrev": 57.5, "BasicForDays": 1100.0, "FixedAllowForDays": 100.0, "OTPay": 230.0, "Gross": 1430.0, "DedSp": 51.19, "DedOthsAdvance": null, "NetSal": 1365.48, "DedDort": 13.33, "OtherAllowLump": 0.0, "Month": "2026-06-01", "EmpID": "E090"}, {"Name": "JAYARAMAN BASKAR", "WorkedDays": 30.0, "OTHrsPrev": 187.5, "BasicForDays": 850.0, "FixedAllowForDays": 0.0, "OTPay": 562.5, "Gross": 1412.5, "DedSp": 39.21, "DedOthsAdvance": null, "NetSal": 1373.29, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-06-01", "EmpID": "E024"}, {"Name": "MOHAN SELVAMURUGAN", "WorkedDays": 30.0, "OTHrsPrev": 117.5, "BasicForDays": 700.0, "FixedAllowForDays": 200.0, "OTPay": 470.0, "Gross": 1384.05, "DedSp": 39.36, "DedOthsAdvance": null, "NetSal": 1344.69, "DedDort": null, "OtherAllowLump": 14.05, "Month": "2026-06-01", "EmpID": "E048"}, {"Name": "SAKTHIVEL SARGUNAM", "WorkedDays": 30.0, "OTHrsPrev": 42.0, "BasicForDays": 850.0, "FixedAllowForDays": 100.0, "OTPay": 126.0, "Gross": 1381.5, "DedSp": 55.89, "DedOthsAdvance": null, "NetSal": 1325.61, "DedDort": null, "OtherAllowLump": 305.5, "Month": "2026-06-01", "EmpID": "E078"}, {"Name": "MANIKAVASAGAM MAHENDRAN", "WorkedDays": 29.0, "OTHrsPrev": 20.0, "BasicForDays": 773.3333333333334, "FixedAllowForDays": 96.66666666666667, "OTPay": 60.0, "Gross": 1376.0, "DedSp": 69.04, "DedOthsAdvance": null, "NetSal": 1288.21, "DedDort": 18.75, "OtherAllowLump": 446.0, "Month": "2026-06-01", "EmpID": "E043"}, {"Name": "SELVARAJ AJITH KUMAR", "WorkedDays": 30.0, "OTHrsPrev": 4.0, "BasicForDays": 700.0, "FixedAllowForDays": 500.00000000000006, "OTPay": 12.0, "Gross": 1318.0, "DedSp": 55.89, "DedOthsAdvance": null, "NetSal": 1262.11, "DedDort": null, "OtherAllowLump": 106.0, "Month": "2026-06-01", "EmpID": "E082"}, {"Name": "VELUCHAMY BOOBALAN", "WorkedDays": 28.0, "OTHrsPrev": 42.0, "BasicForDays": 700.0, "FixedAllowForDays": 70.0, "OTPay": 126.0, "Gross": 1288.5, "DedSp": 55.89, "DedOthsAdvance": null, "NetSal": 1232.61, "DedDort": null, "OtherAllowLump": 392.5, "Month": "2026-06-01", "EmpID": "E102"}, {"Name": "MANI KATHAVARAYAN", "WorkedDays": 29.0, "OTHrsPrev": 52.0, "BasicForDays": 870.0, "FixedAllowForDays": 96.66666666666667, "OTPay": 208.0, "Gross": 1284.6666666666665, "DedSp": 50.64, "DedOthsAdvance": null, "NetSal": 1226.8766666666666, "DedDort": 7.15, "OtherAllowLump": 110.0, "Month": "2026-06-01", "EmpID": "E040"}, {"Name": "RAMALINGAM PRASANTH", "WorkedDays": 15.0, "OTHrsPrev": 105.0, "BasicForDays": 565.0, "FixedAllowForDays": 285.0, "OTPay": 420.0, "Gross": 1270.0, "DedSp": 19.65, "DedOthsAdvance": null, "NetSal": 1250.35, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-06-01", "EmpID": "E070"}, {"Name": "SHANMUGAVEL THIYAGARAJAN", "WorkedDays": 30.0, "OTHrsPrev": 16.0, "BasicForDays": 600.0, "FixedAllowForDays": 500.00000000000006, "OTPay": 64.0, "Gross": 1265.0, "DedSp": 50.64, "DedOthsAdvance": null, "NetSal": 1195.61, "DedDort": 18.75, "OtherAllowLump": 101.0, "Month": "2026-06-01", "EmpID": "E086"}, {"Name": "LAKSHMANAN VISWANATHAN", "WorkedDays": 29.0, "OTHrsPrev": 20.0, "BasicForDays": 580.0, "FixedAllowForDays": 145.0, "OTPay": 60.0, "Gross": 1249.5, "DedSp": 39.21, "DedOthsAdvance": null, "NetSal": 1210.29, "DedDort": null, "OtherAllowLump": 464.5, "Month": "2026-06-01", "EmpID": "E036"}, {"Name": "ISLAM SIFUL", "WorkedDays": 30.0, "OTHrsPrev": 95.0, "BasicForDays": 800.0, "FixedAllowForDays": 50.0, "OTPay": 380.0, "Gross": 1245.25, "DedSp": 51.19, "DedOthsAdvance": null, "NetSal": 1180.73, "DedDort": 13.33, "OtherAllowLump": 15.25, "Month": "2026-06-01", "EmpID": "E023"}, {"Name": "GANESAN MUTHUKUMAR", "WorkedDays": 28.0, "OTHrsPrev": 30.0, "BasicForDays": 746.6666666666667, "FixedAllowForDays": 233.33333333333334, "OTPay": 120.0, "Gross": 1229.0, "DedSp": 69.04, "DedOthsAdvance": 500.0, "NetSal": 641.21, "DedDort": 18.75, "OtherAllowLump": 129.0, "Month": "2026-06-01", "EmpID": "E019"}, {"Name": "KESAVAN NANDHEESWARAN", "WorkedDays": 29.0, "OTHrsPrev": 148.0, "BasicForDays": 676.6666666666666, "FixedAllowForDays": 96.66666666666667, "OTPay": 444.0, "Gross": 1217.3333333333333, "DedSp": 55.89, "DedOthsAdvance": null, "NetSal": 1161.4433333333332, "DedDort": null, "OtherAllowLump": -0.0, "Month": "2026-06-01", "EmpID": "E032"}, {"Name": "BOSE PARTHIBAN", "WorkedDays": 30.0, "OTHrsPrev": 90.0, "BasicForDays": 600.0, "FixedAllowForDays": 100.0, "OTPay": 270.0, "Gross": 1189.0, "DedSp": 50.64, "DedOthsAdvance": null, "NetSal": 1131.21, "DedDort": 7.15, "OtherAllowLump": 219.0, "Month": "2026-06-01", "EmpID": "E014"}, {"Name": "PRAKASH NITHISH", "WorkedDays": 30.0, "OTHrsPrev": 56.7, "BasicForDays": 1000.0000000000001, "FixedAllowForDays": 0.0, "OTPay": 170.10000000000002, "Gross": 1170.1000000000001, "DedSp": 58.88, "DedOthsAdvance": null, "NetSal": 1111.22, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-06-01", "EmpID": "E064"}, {"Name": "PAZHANIYAPPAN AZHAGUMUTHU", "WorkedDays": 29.0, "OTHrsPrev": 44.0, "BasicForDays": 821.6666666666666, "FixedAllowForDays": 0.0, "OTPay": 176.0, "Gross": 1125.6666666666665, "DedSp": 39.21, "DedOthsAdvance": null, "NetSal": 1086.4566666666665, "DedDort": null, "OtherAllowLump": 128.0, "Month": "2026-06-01", "EmpID": "E062"}, {"Name": "MANIKANDAN MANOJ", "WorkedDays": 30.0, "OTHrsPrev": 70.0, "BasicForDays": 650.0, "FixedAllowForDays": 100.0, "OTPay": 210.0, "Gross": 1094.5, "DedSp": 51.19, "DedOthsAdvance": null, "NetSal": 1029.98, "DedDort": 13.33, "OtherAllowLump": 134.5, "Month": "2026-06-01", "EmpID": "E042"}, {"Name": "GAJENDRAN DHIVAKARAN", "WorkedDays": 30.0, "OTHrsPrev": null, "BasicForDays": 975.0, "FixedAllowForDays": 75.0, "OTPay": 0.0, "Gross": 1065.0, "DedSp": 20.08, "DedOthsAdvance": null, "NetSal": 1026.17, "DedDort": 18.75, "OtherAllowLump": 15.0, "Month": "2026-06-01", "EmpID": "E018"}, {"Name": "THANGARASU SAKTHIVEL", "WorkedDays": 30.0, "OTHrsPrev": 55.0, "BasicForDays": 800.0, "FixedAllowForDays": 0.0, "OTPay": 165.0, "Gross": 1047.0, "DedSp": 39.21, "DedOthsAdvance": 200.0, "NetSal": 807.79, "DedDort": null, "OtherAllowLump": 82.0, "Month": "2026-06-01", "EmpID": "E093"}, {"Name": "MARIYAPPAN SABARIRAJAN", "WorkedDays": 30.0, "OTHrsPrev": 65.5, "BasicForDays": 700.0, "FixedAllowForDays": 0.0, "OTPay": 196.5, "Gross": 1046.5, "DedSp": 39.21, "DedOthsAdvance": null, "NetSal": 1007.29, "DedDort": null, "OtherAllowLump": 150.0, "Month": "2026-06-01", "EmpID": "E045"}, {"Name": "YENOSE JEYA MONOSE", "WorkedDays": 29.0, "OTHrsPrev": 14.0, "BasicForDays": 628.3333333333334, "FixedAllowForDays": 96.66666666666667, "OTPay": 42.0, "Gross": 1017.0, "DedSp": 50.64, "DedOthsAdvance": null, "NetSal": 959.21, "DedDort": 7.15, "OtherAllowLump": 250.0, "Month": "2026-06-01", "EmpID": "E107"}, {"Name": "WILLIAM JAYARAJ ANTHONY JAMES", "WorkedDays": 30.0, "OTHrsPrev": 83.0, "BasicForDays": 750.0, "FixedAllowForDays": 0.0, "OTPay": 249.0, "Gross": 999.0, "DedSp": 39.21, "DedOthsAdvance": null, "NetSal": 959.79, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-06-01", "EmpID": "E106"}, {"Name": "VIJENDRAN SURIYAPRAKASH", "WorkedDays": 30.0, "OTHrsPrev": 49.0, "BasicForDays": 650.0, "FixedAllowForDays": 0.0, "OTPay": 147.0, "Gross": 935.0, "DedSp": 50.64, "DedOthsAdvance": 200.0, "NetSal": 677.21, "DedDort": 7.15, "OtherAllowLump": 138.0, "Month": "2026-06-01", "EmpID": "E104"}, {"Name": "CHELLADURAI SABARI RAJAN", "WorkedDays": 27.0, "OTHrsPrev": 9.0, "BasicForDays": 720.0, "FixedAllowForDays": 180.0, "OTPay": 27.0, "Gross": 927.0, "DedSp": 29.3, "DedOthsAdvance": null, "NetSal": 878.95, "DedDort": 18.75, "OtherAllowLump": 0.0, "Month": "2026-06-01", "EmpID": "E015"}, {"Name": "RAJA ASWIN", "WorkedDays": 28.0, "OTHrsPrev": 5.5, "BasicForDays": 466.6666666666667, "FixedAllowForDays": 280.0, "OTPay": 16.5, "Gross": 899.1666666666667, "DedSp": 29.3, "DedOthsAdvance": null, "NetSal": 851.1166666666668, "DedDort": 18.75, "OtherAllowLump": 136.0, "Month": "2026-06-01", "EmpID": "E067"}, {"Name": "RENGARAJ ELAVARASAN", "WorkedDays": 30.0, "OTHrsPrev": 94.0, "BasicForDays": 600.0, "FixedAllowForDays": 0.0, "OTPay": 282.0, "Gross": 882.0, "DedSp": 69.04, "DedOthsAdvance": null, "NetSal": 794.21, "DedDort": 18.75, "OtherAllowLump": 0.0, "Month": "2026-06-01", "EmpID": "E076"}, {"Name": "ISLAM RAFIQUL", "WorkedDays": 30.0, "OTHrsPrev": 23.0, "BasicForDays": 750.0, "FixedAllowForDays": 0.0, "OTPay": 69.0, "Gross": 881.0, "DedSp": 55.89, "DedOthsAdvance": null, "NetSal": 825.11, "DedDort": null, "OtherAllowLump": 62.0, "Month": "2026-06-01", "EmpID": "E022"}, {"Name": "SANDRANU SAI NAGENDRA", "WorkedDays": 30.0, "OTHrsPrev": 21.0, "BasicForDays": 750.0, "FixedAllowForDays": 0.0, "OTPay": 63.0, "Gross": 858.0, "DedSp": 39.36, "DedOthsAdvance": null, "NetSal": 818.64, "DedDort": null, "OtherAllowLump": 45.0, "Month": "2026-06-01", "EmpID": "E080"}, {"Name": "KARUPPIAH CHANDRAN", "WorkedDays": 30.0, "OTHrsPrev": 34.0, "BasicForDays": 650.0, "FixedAllowForDays": 100.0, "OTPay": 102.0, "Gross": 852.0, "DedSp": 55.89, "DedOthsAdvance": null, "NetSal": 796.11, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-06-01", "EmpID": "E030"}, {"Name": "SENTHILKUMAR POOVARASAN", "WorkedDays": 29.0, "OTHrsPrev": 87.0, "BasicForDays": 580.0, "FixedAllowForDays": 0.0, "OTPay": 261.0, "Gross": 841.0, "DedSp": 39.21, "DedOthsAdvance": null, "NetSal": 801.79, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-06-01", "EmpID": "E084"}, {"Name": "SENTHILKUMAR VISWANATHAN", "WorkedDays": 30.0, "OTHrsPrev": 68.0, "BasicForDays": 600.0, "FixedAllowForDays": 0.0, "OTPay": 204.0, "Gross": 804.0, "DedSp": 39.21, "DedOthsAdvance": null, "NetSal": 764.79, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-06-01", "EmpID": "E085"}, {"Name": "BERCHMANS JOEL", "WorkedDays": 28.0, "OTHrsPrev": 12.0, "BasicForDays": 767.741935483871, "FixedAllowForDays": 0.0, "OTPay": 36.0, "Gross": 803.741935483871, "DedSp": 29.3, "DedOthsAdvance": null, "NetSal": 755.691935483871, "DedDort": 18.75, "OtherAllowLump": 0.0, "Month": "2026-06-01", "EmpID": "E013"}, {"Name": "ALAGARSAN UDHAYANITHI", "WorkedDays": 30.0, "OTHrsPrev": 19.0, "BasicForDays": 600.0, "FixedAllowForDays": 0.0, "OTPay": 57.0, "Gross": 801.0, "DedSp": 50.64, "DedOthsAdvance": null, "NetSal": 743.21, "DedDort": 7.15, "OtherAllowLump": 144.0, "Month": "2026-06-01", "EmpID": "E005"}, {"Name": "SUBBAIAH PRABU", "WorkedDays": 30.0, "OTHrsPrev": 80.0, "BasicForDays": 550.0, "FixedAllowForDays": 0.0, "OTPay": 240.0, "Gross": 796.0, "DedSp": 55.89, "DedOthsAdvance": null, "NetSal": 740.11, "DedDort": null, "OtherAllowLump": 6.0, "Month": "2026-06-01", "EmpID": "E089"}, {"Name": "KALAYARASAN AKASH", "WorkedDays": 30.0, "OTHrsPrev": 59.0, "BasicForDays": 600.0, "FixedAllowForDays": 0.0, "OTPay": 177.0, "Gross": 784.0, "DedSp": 51.19, "DedOthsAdvance": null, "NetSal": 719.48, "DedDort": 13.33, "OtherAllowLump": 7.0, "Month": "2026-06-01", "EmpID": "E026"}, {"Name": "RAJARAMAN SANTHOSHKUMAR", "WorkedDays": 30.0, "OTHrsPrev": 41.0, "BasicForDays": 550.0, "FixedAllowForDays": 100.0, "OTPay": 123.0, "Gross": 773.0, "DedSp": 50.64, "DedOthsAdvance": null, "NetSal": 715.21, "DedDort": 7.15, "OtherAllowLump": 0.0, "Month": "2026-06-01", "EmpID": "E068"}, {"Name": "KALYANASUNDARAM KARTHIKEYAN", "WorkedDays": 30.0, "OTHrsPrev": 35.0, "BasicForDays": 600.0, "FixedAllowForDays": 0.0, "OTPay": 105.0, "Gross": 750.0, "DedSp": 51.19, "DedOthsAdvance": null, "NetSal": 685.48, "DedDort": 13.33, "OtherAllowLump": 45.0, "Month": "2026-06-01", "EmpID": "E028"}, {"Name": "ANTHONY RAJ SATHRAK RAJA", "WorkedDays": 30.0, "OTHrsPrev": 64.0, "BasicForDays": 550.0, "FixedAllowForDays": 0.0, "OTPay": 192.0, "Gross": 742.0, "DedSp": 51.19, "DedOthsAdvance": null, "NetSal": 677.48, "DedDort": 13.33, "OtherAllowLump": 0.0, "Month": "2026-06-01", "EmpID": "E006"}, {"Name": "PALANISAMY ABILASH", "WorkedDays": 28.0, "OTHrsPrev": 34.0, "BasicForDays": 606.6666666666667, "FixedAllowForDays": 0.0, "OTPay": 102.0, "Gross": 708.6666666666667, "DedSp": 29.3, "DedOthsAdvance": null, "NetSal": 660.6166666666668, "DedDort": 18.75, "OtherAllowLump": 0.0, "Month": "2026-06-01", "EmpID": "E056"}, {"Name": "LAKSHMANAN MANIKANDAN", "WorkedDays": 21.0, "OTHrsPrev": null, "BasicForDays": 455.0, "FixedAllowForDays": 175.0, "OTPay": 0.0, "Gross": 706.0, "DedSp": 28.43, "DedOthsAdvance": null, "NetSal": 670.42, "DedDort": 7.15, "OtherAllowLump": 76.0, "Month": "2026-06-01", "EmpID": "E035"}, {"Name": "VASUDEVAN GOPINATH", "WorkedDays": 30.0, "OTHrsPrev": 10.0, "BasicForDays": 600.0, "FixedAllowForDays": 0.0, "OTPay": 30.0, "Gross": 704.0, "DedSp": 50.64, "DedOthsAdvance": null, "NetSal": 646.21, "DedDort": 7.15, "OtherAllowLump": 74.0, "Month": "2026-06-01", "EmpID": "E099"}, {"Name": "RAMAYA MANIKANDAN", "WorkedDays": 17.0, "OTHrsPrev": null, "BasicForDays": 555.3333333333333, "FixedAllowForDays": 130.33333333333334, "OTPay": 0.0, "Gross": 685.6666666666666, "DedSp": null, "DedOthsAdvance": null, "NetSal": 648.1666666666666, "DedDort": 37.5, "OtherAllowLump": 0.0, "Month": "2026-06-01", "EmpID": "E073"}, {"Name": "MAHATMA AKILAN", "WorkedDays": 24.0, "OTHrsPrev": null, "BasicForDays": 680.0, "FixedAllowForDays": 0.0, "OTPay": 0.0, "Gross": 680.0, "DedSp": 32.26, "DedOthsAdvance": null, "NetSal": 647.74, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-06-01", "EmpID": "E038"}, {"Name": "THINESH VISHVA", "WorkedDays": 29.0, "OTHrsPrev": 30.0, "BasicForDays": 580.0, "FixedAllowForDays": 0.0, "OTPay": 90.0, "Gross": 670.0, "DedSp": 51.19, "DedOthsAdvance": null, "NetSal": 605.48, "DedDort": 13.33, "OtherAllowLump": 0.0, "Month": "2026-06-01", "EmpID": "E095"}, {"Name": "AROCKIYARAJ ISEN", "WorkedDays": 30.0, "OTHrsPrev": 18.0, "BasicForDays": 600.0, "FixedAllowForDays": 0.0, "OTPay": 54.0, "Gross": 666.0, "DedSp": 39.21, "DedOthsAdvance": null, "NetSal": 626.79, "DedDort": null, "OtherAllowLump": 12.0, "Month": "2026-06-01", "EmpID": "E007"}, {"Name": "BALASUBRAMANIAN PRAVEEN", "WorkedDays": 28.0, "OTHrsPrev": 18.0, "BasicForDays": 560.0, "FixedAllowForDays": 0.0, "OTPay": 54.0, "Gross": 653.0, "DedSp": 29.3, "DedOthsAdvance": null, "NetSal": 604.95, "DedDort": 18.75, "OtherAllowLump": 39.0, "Month": "2026-06-01", "EmpID": "E012"}, {"Name": "SANKAR ALAGUMANIKANDAN", "WorkedDays": 30.0, "OTHrsPrev": 1.0, "BasicForDays": 650.0, "FixedAllowForDays": 0.0, "OTPay": 3.0, "Gross": 653.0, "DedSp": 39.21, "DedOthsAdvance": null, "NetSal": 613.79, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-06-01", "EmpID": "E081"}, {"Name": "PRAKASH PRAVEEN RAJ", "WorkedDays": 30.0, "OTHrsPrev": null, "BasicForDays": 650.0, "FixedAllowForDays": 0.0, "OTPay": 0.0, "Gross": 650.0, "DedSp": 51.19, "DedOthsAdvance": null, "NetSal": 585.48, "DedDort": 13.33, "OtherAllowLump": 0.0, "Month": "2026-06-01", "EmpID": "E065"}, {"Name": "PAUL APU", "WorkedDays": 30.0, "OTHrsPrev": 15.0, "BasicForDays": 600.0, "FixedAllowForDays": 0.0, "OTPay": 45.0, "Gross": 648.25, "DedSp": 55.89, "DedOthsAdvance": null, "NetSal": 592.36, "DedDort": null, "OtherAllowLump": 3.25, "Month": "2026-06-01", "EmpID": "E061"}, {"Name": "RAVICHANDRAN PRAKASH", "WorkedDays": 5.0, "OTHrsPrev": 49.0, "BasicForDays": 125.0, "FixedAllowForDays": 0.0, "OTPay": 147.0, "Gross": 641.0, "DedSp": 7.39, "DedOthsAdvance": null, "NetSal": 614.86, "DedDort": 18.75, "OtherAllowLump": 369.0, "Month": "2026-06-01", "EmpID": "E074"}, {"Name": "VAGISAN VASANTHAN", "WorkedDays": 30.0, "OTHrsPrev": 13.0, "BasicForDays": 600.0, "FixedAllowForDays": 0.0, "OTPay": 39.0, "Gross": 639.0, "DedSp": 39.21, "DedOthsAdvance": null, "NetSal": 599.79, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-06-01", "EmpID": "E098"}, {"Name": "MURUGAN DHINESH", "WorkedDays": 30.0, "OTHrsPrev": 13.0, "BasicForDays": 600.0, "FixedAllowForDays": 0.0, "OTPay": 39.0, "Gross": 639.0, "DedSp": 39.21, "DedOthsAdvance": null, "NetSal": 599.79, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-06-01", "EmpID": "E050"}, {"Name": "THURAIPANDIYAN JEYAKUMAR", "WorkedDays": 21.0, "OTHrsPrev": null, "BasicForDays": 560.0, "FixedAllowForDays": 70.0, "OTPay": 0.0, "Gross": 630.0, "DedSp": 28.58, "DedOthsAdvance": null, "NetSal": 601.42, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-06-01", "EmpID": "E097"}, {"Name": "NATARAJAN SAKTHIJANARTHANAN", "WorkedDays": 12.0, "OTHrsPrev": 8.0, "BasicForDays": 524.0, "FixedAllowForDays": 20.0, "OTPay": 24.0, "Gross": 610.0, "DedSp": 16.27, "DedOthsAdvance": null, "NetSal": 574.98, "DedDort": 18.75, "OtherAllowLump": 42.0, "Month": "2026-06-01", "EmpID": "E053"}, {"Name": "AKKINIRAJA BHARATH SANJAY", "WorkedDays": 29.0, "OTHrsPrev": 4.0, "BasicForDays": 608.0645161290323, "FixedAllowForDays": 0.0, "OTPay": null, "Gross": 608.0645161290323, "DedSp": 51.19, "DedOthsAdvance": null, "NetSal": 543.5445161290323, "DedDort": 13.33, "OtherAllowLump": 0.0, "Month": "2026-06-01", "EmpID": "E004"}, {"Name": "MUTHUKUMARASAMY  KAVITHASAN", "WorkedDays": 28.0, "OTHrsPrev": null, "BasicForDays": 606.6666666666667, "FixedAllowForDays": 0.0, "OTPay": null, "Gross": 606.6666666666667, "DedSp": 29.3, "DedOthsAdvance": null, "NetSal": 558.6166666666668, "DedDort": 18.75, "OtherAllowLump": 0.0, "Month": "2026-06-01", "EmpID": "E052"}, {"Name": "ARUNAGIRI KANNAN", "WorkedDays": 24.0, "OTHrsPrev": null, "BasicForDays": 400.0, "FixedAllowForDays": 200.0, "OTPay": 0.0, "Gross": 600.0, "DedSp": 36.13, "DedOthsAdvance": null, "NetSal": 550.54, "DedDort": 13.33, "OtherAllowLump": 0.0, "Month": "2026-06-01", "EmpID": "E009"}, {"Name": "TAMILARASAN DINESHKUMAR", "WorkedDays": 21.0, "OTHrsPrev": null, "BasicForDays": 420.0, "FixedAllowForDays": 70.0, "OTPay": 0.0, "Gross": 490.0, "DedSp": 28.43, "DedOthsAdvance": null, "NetSal": 454.42, "DedDort": 7.15, "OtherAllowLump": 0.0, "Month": "2026-06-01", "EmpID": "E091"}, {"Name": "PERUMAL MOORTHY", "WorkedDays": 11.0, "OTHrsPrev": null, "BasicForDays": 403.3333333333333, "FixedAllowForDays": 36.66666666666667, "OTPay": 0.0, "Gross": 440.0, "DedSp": 29.3, "DedOthsAdvance": null, "NetSal": 391.95, "DedDort": 18.75, "OtherAllowLump": 0.0, "Month": "2026-06-01", "EmpID": "E063"}, {"Name": "PAKKIRISAMY SATHYARAJ", "WorkedDays": 0.0, "OTHrsPrev": 45.0, "BasicForDays": 0.0, "FixedAllowForDays": 0.0, "OTPay": 135.0, "Gross": 272.0, "DedSp": null, "DedOthsAdvance": null, "NetSal": 272.0, "DedDort": null, "OtherAllowLump": 137.0, "Month": "2026-06-01", "EmpID": "E055"}, {"Name": "ADHIMOOLAM GANESH", "WorkedDays": 0.0, "OTHrsPrev": 29.0, "BasicForDays": 0.0, "FixedAllowForDays": 0.0, "OTPay": 145.0, "Gross": 203.0, "DedSp": null, "DedOthsAdvance": null, "NetSal": 203.0, "DedDort": null, "OtherAllowLump": 58.0, "Month": "2026-06-01", "EmpID": "E003"}, {"Name": "ADAIKKAN PERIYAKARUPPAN", "WorkedDays": null, "OTHrsPrev": null, "BasicForDays": 0.0, "FixedAllowForDays": 0.0, "OTPay": 0.0, "Gross": 200.0, "DedSp": null, "DedOthsAdvance": null, "NetSal": 200.0, "DedDort": null, "OtherAllowLump": 200.0, "Month": "2026-06-01", "EmpID": "E002"}, {"Name": "DIPANGKAR", "WorkedDays": 5.0, "OTHrsPrev": null, "BasicForDays": 183.33333333333331, "FixedAllowForDays": 0.0, "OTPay": 0.0, "Gross": 183.33333333333331, "DedSp": 8.57, "DedOthsAdvance": null, "NetSal": 174.76333333333332, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-06-01", "EmpID": "E016"}, {"Name": "JEYARAJ JANAGAR", "WorkedDays": 0.0, "OTHrsPrev": 19.0, "BasicForDays": 0.0, "FixedAllowForDays": 0.0, "OTPay": 95.0, "Gross": 150.0, "DedSp": null, "DedOthsAdvance": null, "NetSal": 150.0, "DedDort": null, "OtherAllowLump": 55.0, "Month": "2026-06-01", "EmpID": "E025"}, {"Name": "KAMBAN KANAGARAJ EMARSON RANJIT", "WorkedDays": 0.0, "OTHrsPrev": 9.0, "BasicForDays": 0.0, "FixedAllowForDays": 0.0, "OTPay": 36.0, "Gross": 96.0, "DedSp": null, "DedOthsAdvance": null, "NetSal": 82.67, "DedDort": 13.33, "OtherAllowLump": 60.0, "Month": "2026-06-01", "EmpID": "E029"}, {"Name": "SELVARAJ ARUN STALIN", "WorkedDays": 2.0, "OTHrsPrev": null, "BasicForDays": 53.333333333333336, "FixedAllowForDays": 26.666666666666668, "OTPay": 0.0, "Gross": 80.0, "DedSp": 4.28, "DedOthsAdvance": null, "NetSal": 75.72, "DedDort": null, "OtherAllowLump": -0.0, "Month": "2026-06-01", "EmpID": "E083"}, {"Name": "PANNER SELVAM SATHIS", "WorkedDays": 0.0, "OTHrsPrev": null, "BasicForDays": 0.0, "FixedAllowForDays": 0.0, "OTPay": 0.0, "Gross": 16.0, "DedSp": null, "DedOthsAdvance": null, "NetSal": 8.85, "DedDort": 7.15, "OtherAllowLump": 16.0, "Month": "2026-06-01", "EmpID": "E059"}, {"Name": "ASHOKKUMAR SRI VENKATESHWARA", "WorkedDays": null, "OTHrsPrev": null, "BasicForDays": 0.0, "FixedAllowForDays": 0.0, "OTPay": 0.0, "Gross": 0.0, "DedSp": null, "DedOthsAdvance": null, "NetSal": 0.0, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-06-01", "EmpID": "E010"}, {"Name": "MURUGESAN SARAVANAN", "WorkedDays": 0.0, "OTHrsPrev": null, "BasicForDays": 0.0, "FixedAllowForDays": 0.0, "OTPay": 0.0, "Gross": 0.0, "DedSp": null, "DedOthsAdvance": null, "NetSal": -7.15, "DedDort": 7.15, "OtherAllowLump": 0.0, "Month": "2026-06-01", "EmpID": "E051"}, {"Name": "VELCY ARUL ANAND BRITTO", "WorkedDays": 0.0, "OTHrsPrev": null, "BasicForDays": 0.0, "FixedAllowForDays": 0.0, "OTPay": 0.0, "Gross": 0.0, "DedSp": null, "DedOthsAdvance": null, "NetSal": 0.0, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-06-01", "EmpID": "E101"}, {"Name": "THALIYAN GEORGE JOMAN", "WorkedDays": null, "OTHrsPrev": null, "BasicForDays": 0.0, "FixedAllowForDays": 0.0, "OTPay": 0.0, "Gross": 0.0, "DedSp": null, "DedOthsAdvance": null, "NetSal": 0.0, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-06-01", "EmpID": "E092"}, {"Name": "ABDULLAH ALPARMAAN", "WorkedDays": 31.0, "OTHrsPrev": 8.0, "BasicForDays": 3900.0, "FixedAllowForDays": 0.0, "OTPay": 160.0, "Gross": 4152.0, "DedSp": 43.63, "DedOthsAdvance": null, "NetSal": 4108.37, "DedDort": null, "OtherAllowLump": 92.0, "Month": "2026-07-01", "EmpID": "E001"}, {"Name": "RAMAR SATHYAJOTHI", "WorkedDays": 31.0, "OTHrsPrev": null, "BasicForDays": 1800.0, "FixedAllowForDays": 200.0, "OTPay": 0.0, "Gross": 3450.0, "DedSp": 29.66, "DedOthsAdvance": null, "NetSal": 3420.34, "DedDort": null, "OtherAllowLump": 1450.0, "Month": "2026-07-01", "EmpID": "E072"}, {"Name": "MATHI ANTONY SIL KUPPER SINGH", "WorkedDays": 31.0, "OTHrsPrev": 86.0, "BasicForDays": 2000.0, "FixedAllowForDays": 200.0, "OTPay": 430.0, "Gross": 2992.0, "DedSp": 0.0, "DedOthsAdvance": 200.0, "NetSal": 2792.0, "DedDort": null, "OtherAllowLump": 362.0, "Month": "2026-07-01", "EmpID": "E046"}, {"Name": "RAMACHANDRAN BALAJI", "WorkedDays": 29.0, "OTHrsPrev": 8.0, "BasicForDays": 2151.6129032258063, "FixedAllowForDays": 0.0, "OTPay": 96.0, "Gross": 2767.6129032258063, "DedSp": 63.63, "DedOthsAdvance": 300.0, "NetSal": 2403.9829032258062, "DedDort": null, "OtherAllowLump": 520.0, "Month": "2026-07-01", "EmpID": "E069"}, {"Name": "KUPPAN SABARIVASAN", "WorkedDays": 30.0, "OTHrsPrev": 72.0, "BasicForDays": 1935.483870967742, "FixedAllowForDays": 193.54838709677418, "OTPay": 360.0, "Gross": 2589.032258064516, "DedSp": 43.63, "DedOthsAdvance": null, "NetSal": 2545.402258064516, "DedDort": null, "OtherAllowLump": 100.0, "Month": "2026-07-01", "EmpID": "E034"}, {"Name": "THALIYAN GEORGE JOMAN", "WorkedDays": 31.0, "OTHrsPrev": 10.0, "BasicForDays": 2500.0, "FixedAllowForDays": 0.0, "OTPay": 0.0, "Gross": 2500.0, "DedSp": 10.18, "DedOthsAdvance": null, "NetSal": 2489.82, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-07-01", "EmpID": "E092"}, {"Name": "PARAMASIVAM NATARAJAN", "WorkedDays": 31.0, "OTHrsPrev": 182.0, "BasicForDays": 1300.0, "FixedAllowForDays": 150.0, "OTPay": 910.0, "Gross": 2462.0, "DedSp": 43.63, "DedOthsAdvance": null, "NetSal": 2418.37, "DedDort": null, "OtherAllowLump": 102.0, "Month": "2026-07-01", "EmpID": "E060"}, {"Name": "EMRAN E", "WorkedDays": 31.0, "OTHrsPrev": 27.0, "BasicForDays": 1500.0, "FixedAllowForDays": 0.0, "OTPay": 135.0, "Gross": 2400.0, "DedSp": 47.38, "DedOthsAdvance": null, "NetSal": 2352.62, "DedDort": null, "OtherAllowLump": 765.0, "Month": "2026-07-01", "EmpID": "E017"}, {"Name": "BALASUBARAMANIYAN SIVAKUMAR", "WorkedDays": 31.0, "OTHrsPrev": 190.0, "BasicForDays": 1350.0, "FixedAllowForDays": 150.0, "OTPay": 760.0, "Gross": 2260.0, "DedSp": 29.66, "DedOthsAdvance": 200.0, "NetSal": 2030.34, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-07-01", "EmpID": "E011"}, {"Name": "GURUNATHAN MURUGANANTHAM", "WorkedDays": 30.0, "OTHrsPrev": 37.0, "BasicForDays": 1064.516129032258, "FixedAllowForDays": 193.54838709677418, "OTPay": 185.0, "Gross": 2203.064516129032, "DedSp": 50.33, "DedOthsAdvance": null, "NetSal": 2133.9845161290323, "DedDort": 18.75, "OtherAllowLump": 760.0, "Month": "2026-07-01", "EmpID": "E021"}, {"Name": "ARUNACHALAM SANKAR", "WorkedDays": 31.0, "OTHrsPrev": 20.0, "BasicForDays": 1800.0, "FixedAllowForDays": 0.0, "OTPay": 60.0, "Gross": 2201.2, "DedSp": 63.66, "DedOthsAdvance": null, "NetSal": 2137.54, "DedDort": null, "OtherAllowLump": 341.2, "Month": "2026-07-01", "EmpID": "E008"}, {"Name": "SAMBANTHAMOORTHY SIVARAMAN", "WorkedDays": 30.0, "OTHrsPrev": 45.0, "BasicForDays": 1645.1612903225805, "FixedAllowForDays": 145.16129032258064, "OTPay": 225.0, "Gross": 2191.322580645161, "DedSp": 63.66, "DedOthsAdvance": null, "NetSal": 2127.662580645161, "DedDort": null, "OtherAllowLump": 176.0, "Month": "2026-07-01", "EmpID": "E079"}, {"Name": "SELVARAJ AJITH KUMAR", "WorkedDays": 31.0, "OTHrsPrev": 26.0, "BasicForDays": 700.0, "FixedAllowForDays": 500.0, "OTPay": 78.0, "Gross": 2178.0, "DedSp": 50.27, "DedOthsAdvance": null, "NetSal": 2127.73, "DedDort": null, "OtherAllowLump": 900.0, "Month": "2026-07-01", "EmpID": "E082"}, {"Name": "GOVINDARAJ RAJIV", "WorkedDays": 31.0, "OTHrsPrev": 94.0, "BasicForDays": 1700.0, "FixedAllowForDays": 0.0, "OTPay": 282.0, "Gross": 2145.7, "DedSp": 50.27, "DedOthsAdvance": null, "NetSal": 2095.43, "DedDort": null, "OtherAllowLump": 163.7, "Month": "2026-07-01", "EmpID": "E020"}, {"Name": "KALIMUTHU SANKAR", "WorkedDays": 31.0, "OTHrsPrev": 95.0, "BasicForDays": 1150.0, "FixedAllowForDays": 100.0, "OTPay": 285.0, "Gross": 2118.2, "DedSp": 63.66, "DedOthsAdvance": null, "NetSal": 2054.54, "DedDort": null, "OtherAllowLump": 583.2, "Month": "2026-07-01", "EmpID": "E027"}, {"Name": "THEKKEKARA PRADEEP", "WorkedDays": 31.0, "OTHrsPrev": 48.0, "BasicForDays": 1350.0, "FixedAllowForDays": 75.0, "OTPay": 144.0, "Gross": 2084.4, "DedSp": 50.33, "DedOthsAdvance": null, "NetSal": 2015.3200000000002, "DedDort": 18.75, "OtherAllowLump": 515.4, "Month": "2026-07-01", "EmpID": "E094"}, {"Name": "RAVICHANDRAN SRIRAM", "WorkedDays": 31.0, "OTHrsPrev": 16.0, "BasicForDays": 1100.0, "FixedAllowForDays": 200.0, "OTPay": 80.0, "Gross": 2019.0, "DedSp": 57.3, "DedOthsAdvance": 200.0, "NetSal": 1761.7, "DedDort": null, "OtherAllowLump": 639.0, "Month": "2026-07-01", "EmpID": "E075"}, {"Name": "SIVARAMAN SUNDARAJAN", "WorkedDays": 31.0, "OTHrsPrev": 22.0, "BasicForDays": 1500.0, "FixedAllowForDays": 0.0, "OTPay": 110.0, "Gross": 1997.2, "DedSp": 34.92, "DedOthsAdvance": null, "NetSal": 1962.28, "DedDort": null, "OtherAllowLump": 387.2, "Month": "2026-07-01", "EmpID": "E087"}, {"Name": "RAJ VETHAMANICKAM", "WorkedDays": 31.0, "OTHrsPrev": 26.0, "BasicForDays": 1400.0, "FixedAllowForDays": 75.0, "OTPay": 78.0, "Gross": 1977.0, "DedSp": 63.66, "DedOthsAdvance": null, "NetSal": 1913.34, "DedDort": null, "OtherAllowLump": 424.0, "Month": "2026-07-01", "EmpID": "E066"}, {"Name": "PADALA ANJINIKUMAR", "WorkedDays": 31.0, "OTHrsPrev": 203.0, "BasicForDays": 1000.0, "FixedAllowForDays": 150.0, "OTPay": 812.0, "Gross": 1962.0, "DedSp": 50.27, "DedOthsAdvance": 400.0, "NetSal": 1511.73, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-07-01", "EmpID": "E054"}, {"Name": "RAMALINGAM PRASANTH", "WorkedDays": 31.0, "OTHrsPrev": 65.0, "BasicForDays": 1130.0, "FixedAllowForDays": 570.0, "OTPay": 260.0, "Gross": 1960.0, "DedSp": 21.18, "DedOthsAdvance": null, "NetSal": 1938.82, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-07-01", "EmpID": "E070"}, {"Name": "THOMAS SIVA PRASAD", "WorkedDays": 31.0, "OTHrsPrev": 120.0, "BasicForDays": 900.0, "FixedAllowForDays": 0.0, "OTPay": 360.0, "Gross": 1843.0, "DedSp": 42.92, "DedOthsAdvance": 200.0, "NetSal": 1600.08, "DedDort": null, "OtherAllowLump": 583.0, "Month": "2026-07-01", "EmpID": "E096"}, {"Name": "SADAIYAN BALAMURUGAN", "WorkedDays": 31.0, "OTHrsPrev": 59.0, "BasicForDays": 1200.0, "FixedAllowForDays": 250.0, "OTPay": 236.0, "Gross": 1788.0, "DedSp": 29.66, "DedOthsAdvance": null, "NetSal": 1758.34, "DedDort": null, "OtherAllowLump": 102.0, "Month": "2026-07-01", "EmpID": "E077"}, {"Name": "MALAIRASU RAMARASU", "WorkedDays": 31.0, "OTHrsPrev": 175.0, "BasicForDays": 1100.0, "FixedAllowForDays": 150.0, "OTPay": 525.0, "Gross": 1775.0, "DedSp": 34.92, "DedOthsAdvance": 500.0, "NetSal": 1240.08, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-07-01", "EmpID": "E039"}, {"Name": "MUNIYAMUTHU   SUBRAMANIAN", "WorkedDays": 31.0, "OTHrsPrev": 84.0, "BasicForDays": 880.0, "FixedAllowForDays": 100.0, "OTPay": 252.0, "Gross": 1758.8, "DedSp": 29.66, "DedOthsAdvance": 300.0, "NetSal": 1429.1399999999999, "DedDort": null, "OtherAllowLump": 526.8, "Month": "2026-07-01", "EmpID": "E049"}, {"Name": "SIVASANKARAN VIJAYAKUMAR", "WorkedDays": 31.0, "OTHrsPrev": 100.0, "BasicForDays": 980.0, "FixedAllowForDays": 0.0, "OTPay": 300.0, "Gross": 1695.0, "DedSp": 29.66, "DedOthsAdvance": 200.0, "NetSal": 1465.34, "DedDort": null, "OtherAllowLump": 415.0, "Month": "2026-07-01", "EmpID": "E088"}, {"Name": "RAMAR MARISAN", "WorkedDays": 31.0, "OTHrsPrev": 38.0, "BasicForDays": 980.0, "FixedAllowForDays": 0.0, "OTPay": 114.0, "Gross": 1644.8, "DedSp": 50.33, "DedOthsAdvance": null, "NetSal": 1575.72, "DedDort": 18.75, "OtherAllowLump": 550.8, "Month": "2026-07-01", "EmpID": "E071"}, {"Name": "GAJENDRAN DHIVAKARAN", "WorkedDays": 31.0, "OTHrsPrev": 30.0, "BasicForDays": 975.0, "FixedAllowForDays": 75.0, "OTPay": 90.0, "Gross": 1592.0, "DedSp": 20.76, "DedOthsAdvance": null, "NetSal": 1571.24, "DedDort": null, "OtherAllowLump": 452.0, "Month": "2026-07-01", "EmpID": "E018"}, {"Name": "PALANISAMY VIJYAKUMAR", "WorkedDays": 31.0, "OTHrsPrev": 61.5, "BasicForDays": 1300.0, "FixedAllowForDays": 0.0, "OTPay": 246.0, "Gross": 1590.0, "DedSp": 43.63, "DedOthsAdvance": null, "NetSal": 1546.37, "DedDort": null, "OtherAllowLump": 44.0, "Month": "2026-07-01", "EmpID": "E057"}, {"Name": "NATARAJAN SAKTHIJANARTHANAN", "WorkedDays": 31.0, "OTHrsPrev": 12.0, "BasicForDays": 1310.0, "FixedAllowForDays": 50.0, "OTPay": 36.0, "Gross": 1554.4, "DedSp": 18.45, "DedOthsAdvance": 300.0, "NetSal": 1217.2, "DedDort": 18.75, "OtherAllowLump": 158.4, "Month": "2026-07-01", "EmpID": "E053"}, {"Name": "PANDI SANTHAKUMAR", "WorkedDays": 31.0, "OTHrsPrev": 100.0, "BasicForDays": 650.0, "FixedAllowForDays": 100.0, "OTPay": 300.0, "Gross": 1519.5, "DedSp": 50.33, "DedOthsAdvance": null, "NetSal": 1450.42, "DedDort": 18.75, "OtherAllowLump": 469.5, "Month": "2026-07-01", "EmpID": "E058"}, {"Name": "MAHARASAN KAJENDRAN", "WorkedDays": 31.0, "OTHrsPrev": 26.0, "BasicForDays": 1075.0, "FixedAllowForDays": 125.0, "OTPay": 130.0, "Gross": 1502.0, "DedSp": 50.33, "DedOthsAdvance": null, "NetSal": 1432.92, "DedDort": 18.75, "OtherAllowLump": 172.0, "Month": "2026-07-01", "EmpID": "E037"}, {"Name": "VEDIYAPPAN SISUKUMAR", "WorkedDays": 31.0, "OTHrsPrev": 13.0, "BasicForDays": 1200.0, "FixedAllowForDays": 0.0, "OTPay": 65.0, "Gross": 1469.0, "DedSp": 43.63, "DedOthsAdvance": null, "NetSal": 1425.37, "DedDort": null, "OtherAllowLump": 204.0, "Month": "2026-07-01", "EmpID": "E100"}, {"Name": "JAYARAMAN BASKAR", "WorkedDays": 31.0, "OTHrsPrev": 205.0, "BasicForDays": 850.0, "FixedAllowForDays": 0.0, "OTPay": 615.0, "Gross": 1465.0, "DedSp": 34.92, "DedOthsAdvance": null, "NetSal": 1430.08, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-07-01", "EmpID": "E024"}, {"Name": "KARUPPIAH MEYAPPAN", "WorkedDays": 31.0, "OTHrsPrev": 72.0, "BasicForDays": 1100.0, "FixedAllowForDays": 50.0, "OTPay": 288.0, "Gross": 1440.3, "DedSp": 47.38, "DedOthsAdvance": null, "NetSal": 1392.9199999999998, "DedDort": null, "OtherAllowLump": 2.3, "Month": "2026-07-01", "EmpID": "E031"}, {"Name": "KOOLAIAN SUBRAMANIAN", "WorkedDays": 31.0, "OTHrsPrev": 22.0, "BasicForDays": 1125.0, "FixedAllowForDays": 125.0, "OTPay": 88.0, "Gross": 1440.0, "DedSp": 29.66, "DedOthsAdvance": null, "NetSal": 1410.34, "DedDort": null, "OtherAllowLump": 102.0, "Month": "2026-07-01", "EmpID": "E033"}, {"Name": "SELVARAJ ARUN STALIN", "WorkedDays": 31.0, "OTHrsPrev": 38.0, "BasicForDays": 800.0, "FixedAllowForDays": 400.0, "OTPay": 152.0, "Gross": 1432.0, "DedSp": 5.03, "DedOthsAdvance": null, "NetSal": 1426.97, "DedDort": null, "OtherAllowLump": 80.0, "Month": "2026-07-01", "EmpID": "E083"}, {"Name": "MARI KOTTAICHAMY", "WorkedDays": 28.0, "OTHrsPrev": 53.0, "BasicForDays": 903.2258064516129, "FixedAllowForDays": 135.48387096774195, "OTPay": 212.0, "Gross": 1374.7096774193549, "DedSp": 27.8, "DedOthsAdvance": 200.0, "NetSal": 1128.159677419355, "DedDort": 18.75, "OtherAllowLump": 124.0, "Month": "2026-07-01", "EmpID": "E044"}, {"Name": "THURAIPANDIYAN JEYAKUMAR", "WorkedDays": 31.0, "OTHrsPrev": 40.0, "BasicForDays": 800.0, "FixedAllowForDays": 100.0, "OTPay": 120.0, "Gross": 1352.5, "DedSp": 33.51, "DedOthsAdvance": null, "NetSal": 1318.99, "DedDort": null, "OtherAllowLump": 332.5, "Month": "2026-07-01", "EmpID": "E097"}, {"Name": "MANIKAVASAGAM MAHENDRAN", "WorkedDays": 31.0, "OTHrsPrev": 18.0, "BasicForDays": 800.0, "FixedAllowForDays": 100.0, "OTPay": 54.0, "Gross": 1349.5, "DedSp": 50.33, "DedOthsAdvance": null, "NetSal": 1280.42, "DedDort": 18.75, "OtherAllowLump": 395.5, "Month": "2026-07-01", "EmpID": "E043"}, {"Name": "MOHAN SELVAMURUGAN", "WorkedDays": 31.0, "OTHrsPrev": 90.0, "BasicForDays": 700.0, "FixedAllowForDays": 200.0, "OTPay": 360.0, "Gross": 1320.0, "DedSp": 43.63, "DedOthsAdvance": 200.0, "NetSal": 1076.37, "DedDort": null, "OtherAllowLump": 60.0, "Month": "2026-07-01", "EmpID": "E048"}, {"Name": "SAKTHIVEL SARGUNAM", "WorkedDays": 31.0, "OTHrsPrev": 36.0, "BasicForDays": 850.0, "FixedAllowForDays": 100.0, "OTPay": 108.0, "Gross": 1315.0, "DedSp": 50.27, "DedOthsAdvance": null, "NetSal": 1264.73, "DedDort": null, "OtherAllowLump": 257.0, "Month": "2026-07-01", "EmpID": "E078"}, {"Name": "PERUMAL MOORTHY", "WorkedDays": 31.0, "OTHrsPrev": 9.0, "BasicForDays": 1100.0, "FixedAllowForDays": 100.0, "OTPay": 36.0, "Gross": 1274.0, "DedSp": 29.66, "DedOthsAdvance": null, "NetSal": 1244.34, "DedDort": null, "OtherAllowLump": 38.0, "Month": "2026-07-01", "EmpID": "E063"}, {"Name": "LAKSHMANAN VISWANATHAN", "WorkedDays": 31.0, "OTHrsPrev": 12.0, "BasicForDays": 600.0, "FixedAllowForDays": 150.0, "OTPay": 36.0, "Gross": 1247.0, "DedSp": 34.92, "DedOthsAdvance": null, "NetSal": 1212.08, "DedDort": null, "OtherAllowLump": 461.0, "Month": "2026-07-01", "EmpID": "E036"}, {"Name": "KESAVAN NANDHEESWARAN", "WorkedDays": 31.0, "OTHrsPrev": 147.0, "BasicForDays": 700.0, "FixedAllowForDays": 100.0, "OTPay": 441.0, "Gross": 1241.0, "DedSp": 50.27, "DedOthsAdvance": null, "NetSal": 1190.73, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-07-01", "EmpID": "E032"}, {"Name": "SHANMUGAVEL THIYAGARAJAN", "WorkedDays": 30.0, "OTHrsPrev": 23.0, "BasicForDays": 580.6451612903226, "FixedAllowForDays": 483.8709677419355, "OTPay": 92.0, "Gross": 1236.516129032258, "DedSp": 42.92, "DedOthsAdvance": null, "NetSal": 1193.596129032258, "DedDort": null, "OtherAllowLump": 80.0, "Month": "2026-07-01", "EmpID": "E086"}, {"Name": "DIPANGKAR", "WorkedDays": 31.0, "OTHrsPrev": 6.0, "BasicForDays": 1100.0, "FixedAllowForDays": 0.0, "OTPay": 30.0, "Gross": 1230.0, "DedSp": 10.05, "DedOthsAdvance": null, "NetSal": 1219.95, "DedDort": null, "OtherAllowLump": 100.0, "Month": "2026-07-01", "EmpID": "E016"}, {"Name": "MAHATMA AKILAN", "WorkedDays": 31.0, "OTHrsPrev": 117.0, "BasicForDays": 850.0, "FixedAllowForDays": 0.0, "OTPay": 351.0, "Gross": 1201.0, "DedSp": 34.92, "DedOthsAdvance": null, "NetSal": 1166.08, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-07-01", "EmpID": "E038"}, {"Name": "MANI KATHAVARAYAN", "WorkedDays": 26.0, "OTHrsPrev": 57.0, "BasicForDays": 754.8387096774193, "FixedAllowForDays": 83.87096774193547, "OTPay": 228.0, "Gross": 1168.7096774193546, "DedSp": 42.92, "DedOthsAdvance": null, "NetSal": 1125.7896774193546, "DedDort": null, "OtherAllowLump": 102.0, "Month": "2026-07-01", "EmpID": "E040"}, {"Name": "THANGARASU SAKTHIVEL", "WorkedDays": 31.0, "OTHrsPrev": 70.0, "BasicForDays": 800.0, "FixedAllowForDays": 0.0, "OTPay": 210.0, "Gross": 1154.0, "DedSp": 34.92, "DedOthsAdvance": 200.0, "NetSal": 919.0799999999999, "DedDort": null, "OtherAllowLump": 144.0, "Month": "2026-07-01", "EmpID": "E093"}, {"Name": "PAZHANIYAPPAN AZHAGUMUTHU", "WorkedDays": 29.0, "OTHrsPrev": 54.0, "BasicForDays": 795.1612903225806, "FixedAllowForDays": 0.0, "OTPay": 216.0, "Gross": 1149.1612903225805, "DedSp": 34.92, "DedOthsAdvance": 500.0, "NetSal": 614.2412903225805, "DedDort": null, "OtherAllowLump": 138.0, "Month": "2026-07-01", "EmpID": "E062"}, {"Name": "ISLAM RAFIQUL", "WorkedDays": 31.0, "OTHrsPrev": 49.0, "BasicForDays": 750.0, "FixedAllowForDays": 0.0, "OTPay": 147.0, "Gross": 1135.0, "DedSp": 50.27, "DedOthsAdvance": null, "NetSal": 1084.73, "DedDort": null, "OtherAllowLump": 238.0, "Month": "2026-07-01", "EmpID": "E022"}, {"Name": "CHELLADURAI SABARI RAJAN", "WorkedDays": 31.0, "OTHrsPrev": 44.0, "BasicForDays": 800.0, "FixedAllowForDays": 200.0, "OTPay": 132.0, "Gross": 1132.0, "DedSp": 29.66, "DedOthsAdvance": null, "NetSal": 1102.34, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-07-01", "EmpID": "E015"}, {"Name": "ISLAM SIFUL", "WorkedDays": 31.0, "OTHrsPrev": 55.0, "BasicForDays": 800.0, "FixedAllowForDays": 50.0, "OTPay": 220.0, "Gross": 1130.0, "DedSp": 47.38, "DedOthsAdvance": null, "NetSal": 1082.62, "DedDort": null, "OtherAllowLump": 60.0, "Month": "2026-07-01", "EmpID": "E023"}, {"Name": "PRAKASH NITHISH", "WorkedDays": 31.0, "OTHrsPrev": 40.5, "BasicForDays": 1000.0, "FixedAllowForDays": 0.0, "OTPay": 121.5, "Gross": 1121.5, "DedSp": 63.66, "DedOthsAdvance": null, "NetSal": 1057.84, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-07-01", "EmpID": "E064"}, {"Name": "YENOSE JEYA MONOSE", "WorkedDays": 31.0, "OTHrsPrev": 20.0, "BasicForDays": 650.0, "FixedAllowForDays": 100.0, "OTPay": 60.0, "Gross": 1098.0, "DedSp": 42.92, "DedOthsAdvance": null, "NetSal": 1055.08, "DedDort": null, "OtherAllowLump": 288.0, "Month": "2026-07-01", "EmpID": "E107"}, {"Name": "RAJA ASWIN", "WorkedDays": 29.0, "OTHrsPrev": 22.5, "BasicForDays": 467.741935483871, "FixedAllowForDays": 280.64516129032256, "OTPay": 67.5, "Gross": 1061.8870967741937, "DedSp": 29.66, "DedOthsAdvance": null, "NetSal": 1032.2270967741936, "DedDort": null, "OtherAllowLump": 246.0, "Month": "2026-07-01", "EmpID": "E067"}, {"Name": "WILLIAM JAYARAJ ANTHONY JAMES", "WorkedDays": 31.0, "OTHrsPrev": 92.0, "BasicForDays": 750.0, "FixedAllowForDays": 0.0, "OTPay": 276.0, "Gross": 1026.0, "DedSp": 34.92, "DedOthsAdvance": null, "NetSal": 991.08, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-07-01", "EmpID": "E106"}, {"Name": "BERCHMANS JOEL", "WorkedDays": 31.0, "OTHrsPrev": 58.5, "BasicForDays": 850.0, "FixedAllowForDays": 0.0, "OTPay": 175.5, "Gross": 1025.5, "DedSp": 29.66, "DedOthsAdvance": null, "NetSal": 995.84, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-07-01", "EmpID": "E013"}, {"Name": "MANIGANDAN", "WorkedDays": 31.0, "OTHrsPrev": null, "BasicForDays": 1000.0, "FixedAllowForDays": null, "OTPay": null, "Gross": 1000.0, "DedSp": null, "DedOthsAdvance": null, "NetSal": 1000.0, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-07-01", "EmpID": "E041"}, {"Name": "ARUNAGIRI KANNAN", "WorkedDays": 31.0, "OTHrsPrev": 43.0, "BasicForDays": 500.0, "FixedAllowForDays": 250.0, "OTPay": 129.0, "Gross": 991.0, "DedSp": 39.48, "DedOthsAdvance": null, "NetSal": 951.52, "DedDort": null, "OtherAllowLump": 112.0, "Month": "2026-07-01", "EmpID": "E009"}, {"Name": "MARIYAPPAN SABARIRAJAN", "WorkedDays": 29.0, "OTHrsPrev": 60.0, "BasicForDays": 654.8387096774194, "FixedAllowForDays": 0.0, "OTPay": 180.0, "Gross": 976.8387096774194, "DedSp": 34.92, "DedOthsAdvance": null, "NetSal": 941.9187096774194, "DedDort": null, "OtherAllowLump": 142.0, "Month": "2026-07-01", "EmpID": "E045"}, {"Name": "SANDRANU SAI NAGENDRA", "WorkedDays": 31.0, "OTHrsPrev": 23.5, "BasicForDays": 750.0, "FixedAllowForDays": 0.0, "OTPay": 70.5, "Gross": 946.5, "DedSp": 43.63, "DedOthsAdvance": null, "NetSal": 902.87, "DedDort": null, "OtherAllowLump": 126.0, "Month": "2026-07-01", "EmpID": "E080"}, {"Name": "TAMILARASAN DINESHKUMAR", "WorkedDays": 31.0, "OTHrsPrev": 77.0, "BasicForDays": 600.0, "FixedAllowForDays": 100.0, "OTPay": 231.0, "Gross": 931.0, "DedSp": 42.92, "DedOthsAdvance": null, "NetSal": 888.08, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-07-01", "EmpID": "E091"}, {"Name": "SUDHAKAR BALASUBRAMANIAN", "WorkedDays": 12.0, "OTHrsPrev": 105.0, "BasicForDays": 425.80645161290323, "FixedAllowForDays": 38.70967741935483, "OTPay": 420.0, "Gross": 884.516129032258, "DedSp": 47.38, "DedOthsAdvance": null, "NetSal": 837.136129032258, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-07-01", "EmpID": "E090"}, {"Name": "KARUPPIAH CHANDRAN", "WorkedDays": 30.0, "OTHrsPrev": 52.0, "BasicForDays": 629.0322580645161, "FixedAllowForDays": 96.77419354838709, "OTPay": 156.0, "Gross": 881.8064516129032, "DedSp": 50.27, "DedOthsAdvance": null, "NetSal": 831.5364516129032, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-07-01", "EmpID": "E030"}, {"Name": "ALAGARSAN UDHAYANITHI", "WorkedDays": 31.0, "OTHrsPrev": 39.0, "BasicForDays": 600.0, "FixedAllowForDays": 0.0, "OTPay": 117.0, "Gross": 872.0, "DedSp": 42.92, "DedOthsAdvance": null, "NetSal": 829.08, "DedDort": null, "OtherAllowLump": 155.0, "Month": "2026-07-01", "EmpID": "E005"}, {"Name": "MANIKANDAN MANOJ", "WorkedDays": 31.0, "OTHrsPrev": 38.0, "BasicForDays": 650.0, "FixedAllowForDays": 100.0, "OTPay": 114.0, "Gross": 864.0, "DedSp": 47.38, "DedOthsAdvance": null, "NetSal": 816.62, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-07-01", "EmpID": "E042"}, {"Name": "VELUCHAMY BOOBALAN", "WorkedDays": 31.0, "OTHrsPrev": null, "BasicForDays": 750.0, "FixedAllowForDays": 75.0, "OTPay": 0.0, "Gross": 860.0, "DedSp": 50.27, "DedOthsAdvance": null, "NetSal": 809.73, "DedDort": null, "OtherAllowLump": 35.0, "Month": "2026-07-01", "EmpID": "E102"}, {"Name": "VIJENDRAN SURIYAPRAKASH", "WorkedDays": 29.0, "OTHrsPrev": 43.0, "BasicForDays": 608.0645161290323, "FixedAllowForDays": 0.0, "OTPay": 129.0, "Gross": 854.0645161290323, "DedSp": 42.92, "DedOthsAdvance": 200.0, "NetSal": 611.1445161290324, "DedDort": null, "OtherAllowLump": 117.0, "Month": "2026-07-01", "EmpID": "E104"}, {"Name": "RENGARAJ ELAVARASAN", "WorkedDays": 31.0, "OTHrsPrev": 77.0, "BasicForDays": 600.0, "FixedAllowForDays": 0.0, "OTPay": 231.0, "Gross": 831.0, "DedSp": 50.33, "DedOthsAdvance": null, "NetSal": 761.92, "DedDort": 18.75, "OtherAllowLump": 0.0, "Month": "2026-07-01", "EmpID": "E076"}, {"Name": "VASUDEVAN GOPINATH", "WorkedDays": 30.0, "OTHrsPrev": 57.0, "BasicForDays": 580.6451612903226, "FixedAllowForDays": 0.0, "OTPay": 171.0, "Gross": 813.6451612903226, "DedSp": 42.92, "DedOthsAdvance": null, "NetSal": 770.7251612903226, "DedDort": null, "OtherAllowLump": 62.0, "Month": "2026-07-01", "EmpID": "E099"}, {"Name": "MEYYAPPAN MANIKANDAN", "WorkedDays": 8.0, "OTHrsPrev": 161.0, "BasicForDays": 317.4193548387097, "FixedAllowForDays": 12.903225806451612, "OTPay": 483.0, "Gross": 813.3225806451612, "DedSp": 48.33, "DedOthsAdvance": null, "NetSal": 746.2425806451612, "DedDort": 18.75, "OtherAllowLump": -0.0, "Month": "2026-07-01", "EmpID": "E047"}, {"Name": "KALAYARASAN AKASH", "WorkedDays": 31.0, "OTHrsPrev": 70.0, "BasicForDays": 600.0, "FixedAllowForDays": 0.0, "OTPay": 210.0, "Gross": 810.0, "DedSp": 47.38, "DedOthsAdvance": null, "NetSal": 762.62, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-07-01", "EmpID": "E026"}, {"Name": "RAJARAMAN SANTHOSHKUMAR", "WorkedDays": 30.0, "OTHrsPrev": 59.0, "BasicForDays": 532.258064516129, "FixedAllowForDays": 96.77419354838709, "OTPay": 177.0, "Gross": 806.0322580645161, "DedSp": 42.92, "DedOthsAdvance": null, "NetSal": 763.1122580645161, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-07-01", "EmpID": "E068"}, {"Name": "PAKKIRISAMY SATHYARAJ", "WorkedDays": 31.0, "OTHrsPrev": null, "BasicForDays": 800.0, "FixedAllowForDays": 0.0, "OTPay": 0.0, "Gross": 800.0, "DedSp": 0.0, "DedOthsAdvance": null, "NetSal": 800.0, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-07-01", "EmpID": "E055"}, {"Name": "KALYANASUNDARAM KARTHIKEYAN", "WorkedDays": 30.0, "OTHrsPrev": 72.0, "BasicForDays": 580.6451612903226, "FixedAllowForDays": 0.0, "OTPay": 216.0, "Gross": 796.6451612903226, "DedSp": 47.38, "DedOthsAdvance": null, "NetSal": 749.2651612903226, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-07-01", "EmpID": "E028"}, {"Name": "SENTHILKUMAR POOVARASAN", "WorkedDays": 31.0, "OTHrsPrev": 64.0, "BasicForDays": 600.0, "FixedAllowForDays": 0.0, "OTPay": 192.0, "Gross": 792.0, "DedSp": 34.92, "DedOthsAdvance": null, "NetSal": 757.08, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-07-01", "EmpID": "E084"}, {"Name": "AROCKIYARAJ ISEN", "WorkedDays": 30.0, "OTHrsPrev": 63.0, "BasicForDays": 580.6451612903226, "FixedAllowForDays": 0.0, "OTPay": 189.0, "Gross": 781.6451612903226, "DedSp": 34.92, "DedOthsAdvance": null, "NetSal": 746.7251612903226, "DedDort": null, "OtherAllowLump": 12.0, "Month": "2026-07-01", "EmpID": "E007"}, {"Name": "LAKSHMANAN MANIKANDAN", "WorkedDays": 19.0, "OTHrsPrev": null, "BasicForDays": 398.38709677419354, "FixedAllowForDays": 153.2258064516129, "OTPay": 0.0, "Gross": 746.6129032258065, "DedSp": 28.61, "DedOthsAdvance": 551.61, "NetSal": 166.39290322580644, "DedDort": null, "OtherAllowLump": 195.0, "Month": "2026-07-01", "EmpID": "E035"}, {"Name": "BALASUBRAMANIAN PRAVEEN", "WorkedDays": 30.0, "OTHrsPrev": 48.0, "BasicForDays": 580.6451612903226, "FixedAllowForDays": 0.0, "OTPay": 144.0, "Gross": 724.6451612903226, "DedSp": 29.66, "DedOthsAdvance": null, "NetSal": 694.9851612903226, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-07-01", "EmpID": "E012"}, {"Name": "SUBBAIAH PRABU", "WorkedDays": 31.0, "OTHrsPrev": 47.0, "BasicForDays": 550.0, "FixedAllowForDays": 0.0, "OTPay": 141.0, "Gross": 723.0, "DedSp": 50.27, "DedOthsAdvance": null, "NetSal": 672.73, "DedDort": null, "OtherAllowLump": 32.0, "Month": "2026-07-01", "EmpID": "E089"}, {"Name": "ANTHONY RAJ SATHRAK RAJA", "WorkedDays": 30.0, "OTHrsPrev": 59.5, "BasicForDays": 532.258064516129, "FixedAllowForDays": 0.0, "OTPay": 178.5, "Gross": 716.758064516129, "DedSp": 47.38, "DedOthsAdvance": null, "NetSal": 669.378064516129, "DedDort": null, "OtherAllowLump": 6.0, "Month": "2026-07-01", "EmpID": "E006"}, {"Name": "PALANISAMY ABILASH", "WorkedDays": 31.0, "OTHrsPrev": 18.0, "BasicForDays": 650.0, "FixedAllowForDays": 0.0, "OTPay": 54.0, "Gross": 704.0, "DedSp": 29.66, "DedOthsAdvance": null, "NetSal": 674.34, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-07-01", "EmpID": "E056"}, {"Name": "ADAIKKAN PERIYAKARUPPAN", "WorkedDays": 31.0, "OTHrsPrev": 33.0, "BasicForDays": 550.0, "FixedAllowForDays": 0.0, "OTPay": 99.0, "Gross": 674.0, "DedSp": 42.92, "DedOthsAdvance": null, "NetSal": 631.08, "DedDort": null, "OtherAllowLump": 25.0, "Month": "2026-07-01", "EmpID": "E002"}, {"Name": "MUTHUKUMARASAMY  KAVITHASAN", "WorkedDays": 31.0, "OTHrsPrev": 7.5, "BasicForDays": 650.0, "FixedAllowForDays": 0.0, "OTPay": 22.5, "Gross": 672.5, "DedSp": 29.66, "DedOthsAdvance": null, "NetSal": 642.84, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-07-01", "EmpID": "E052"}, {"Name": "SANKAR ALAGUMANIKANDAN", "WorkedDays": 30.0, "OTHrsPrev": 14.0, "BasicForDays": 629.0322580645161, "FixedAllowForDays": 0.0, "OTPay": 42.0, "Gross": 671.0322580645161, "DedSp": 34.92, "DedOthsAdvance": null, "NetSal": 636.1122580645161, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-07-01", "EmpID": "E081"}, {"Name": "PRAKASH PRAVEEN RAJ", "WorkedDays": 31.0, "OTHrsPrev": 2.0, "BasicForDays": 650.0, "FixedAllowForDays": 0.0, "OTPay": 6.0, "Gross": 656.0, "DedSp": 47.38, "DedOthsAdvance": null, "NetSal": 608.62, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-07-01", "EmpID": "E065"}, {"Name": "MURUGAN DHINESH", "WorkedDays": 30.0, "OTHrsPrev": 25.0, "BasicForDays": 580.6451612903226, "FixedAllowForDays": 0.0, "OTPay": 75.0, "Gross": 655.6451612903226, "DedSp": 34.92, "DedOthsAdvance": null, "NetSal": 620.7251612903226, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-07-01", "EmpID": "E050"}, {"Name": "PAUL APU", "WorkedDays": 31.0, "OTHrsPrev": 14.0, "BasicForDays": 600.0, "FixedAllowForDays": 0.0, "OTPay": 42.0, "Gross": 648.0, "DedSp": 50.27, "DedOthsAdvance": null, "NetSal": 597.73, "DedDort": null, "OtherAllowLump": 6.0, "Month": "2026-07-01", "EmpID": "E061"}, {"Name": "THINESH VISHVA", "WorkedDays": 30.0, "OTHrsPrev": 18.0, "BasicForDays": 580.6451612903226, "FixedAllowForDays": 0.0, "OTPay": 54.0, "Gross": 634.6451612903226, "DedSp": 47.38, "DedOthsAdvance": null, "NetSal": 587.2651612903226, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-07-01", "EmpID": "E095"}, {"Name": "VAGISAN VASANTHAN", "WorkedDays": 30.0, "OTHrsPrev": 15.0, "BasicForDays": 580.6451612903226, "FixedAllowForDays": 0.0, "OTPay": 45.0, "Gross": 625.6451612903226, "DedSp": 34.92, "DedOthsAdvance": null, "NetSal": 590.7251612903226, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-07-01", "EmpID": "E098"}, {"Name": "BOSE PARTHIBAN", "WorkedDays": 24.0, "OTHrsPrev": null, "BasicForDays": 464.51612903225805, "FixedAllowForDays": 77.41935483870967, "OTPay": 0.0, "Gross": 541.9354838709677, "DedSp": 42.92, "DedOthsAdvance": null, "NetSal": 499.01548387096767, "DedDort": null, "OtherAllowLump": -0.0, "Month": "2026-07-01", "EmpID": "E014"}, {"Name": "RAMAYA MANIKANDAN", "WorkedDays": 0.0, "OTHrsPrev": 42.0, "BasicForDays": 0.0, "FixedAllowForDays": 0.0, "OTPay": 126.0, "Gross": 450.0, "DedSp": 27.6, "DedOthsAdvance": null, "NetSal": 422.4, "DedDort": null, "OtherAllowLump": 324.0, "Month": "2026-07-01", "EmpID": "E073"}, {"Name": "SENTHILKUMAR VISWANATHAN", "WorkedDays": 16.0, "OTHrsPrev": 27.0, "BasicForDays": 309.6774193548387, "FixedAllowForDays": 0.0, "OTPay": 81.0, "Gross": 390.6774193548387, "DedSp": 53.379999999999995, "DedOthsAdvance": null, "NetSal": 337.2974193548387, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-07-01", "EmpID": "E085"}, {"Name": "VENKATACHALAM SUDHAKAR", "WorkedDays": 0.0, "OTHrsPrev": 130.0, "BasicForDays": 0.0, "FixedAllowForDays": 0.0, "OTPay": 390.0, "Gross": 390.0, "DedSp": 48.33, "DedOthsAdvance": 42.73, "NetSal": 280.19, "DedDort": 18.75, "OtherAllowLump": 0.0, "Month": "2026-07-01", "EmpID": "E103"}, {"Name": "MURUGESAN SARAVANAN", "WorkedDays": 11.0, "OTHrsPrev": null, "BasicForDays": 337.09677419354836, "FixedAllowForDays": 0.0, "OTPay": 0.0, "Gross": 337.09677419354836, "DedSp": 0.0, "DedOthsAdvance": null, "NetSal": 337.09677419354836, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-07-01", "EmpID": "E051"}, {"Name": "GANESAN MUTHUKUMAR", "WorkedDays": 0.0, "OTHrsPrev": 14.5, "BasicForDays": 0.0, "FixedAllowForDays": 0.0, "OTPay": 58.0, "Gross": 308.0, "DedSp": 50.33, "DedOthsAdvance": null, "NetSal": 238.92000000000002, "DedDort": 18.75, "OtherAllowLump": 250.0, "Month": "2026-07-01", "EmpID": "E019"}, {"Name": "ASHOKKUMAR SRI VENKATESHWARA", "WorkedDays": 5.0, "OTHrsPrev": 0.0, "BasicForDays": 88.70967741935485, "FixedAllowForDays": 0.0, "OTPay": 0.0, "Gross": 88.70967741935485, "DedSp": 0.0, "DedOthsAdvance": null, "NetSal": 88.70967741935485, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-07-01", "EmpID": "E010"}, {"Name": "PANNER SELVAM SATHIS", "WorkedDays": 3.0, "OTHrsPrev": null, "BasicForDays": 77.41935483870967, "FixedAllowForDays": 0.0, "OTPay": 0.0, "Gross": 77.41935483870967, "DedSp": 0.0, "DedOthsAdvance": null, "NetSal": 77.41935483870967, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-07-01", "EmpID": "E059"}, {"Name": "AKKINIRAJA BHARATH SANJAY", "WorkedDays": 0.0, "OTHrsPrev": null, "BasicForDays": 0.0, "FixedAllowForDays": 0.0, "OTPay": 0.0, "Gross": 0.0, "DedSp": 47.38, "DedOthsAdvance": null, "NetSal": -47.38, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-07-01", "EmpID": "E004"}, {"Name": "KAMBAN KANAGARAJ EMARSON RANJIT", "WorkedDays": 0.0, "OTHrsPrev": null, "BasicForDays": 0.0, "FixedAllowForDays": 0.0, "OTPay": 0.0, "Gross": 0.0, "DedSp": 0.0, "DedOthsAdvance": null, "NetSal": 0.0, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-07-01", "EmpID": "E029"}, {"Name": "JEYARAJ JANAGAR", "WorkedDays": 0.0, "OTHrsPrev": null, "BasicForDays": 0.0, "FixedAllowForDays": 0.0, "OTPay": 0.0, "Gross": 0.0, "DedSp": 0.0, "DedOthsAdvance": null, "NetSal": 0.0, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-07-01", "EmpID": "E025"}, {"Name": "ADHIMOOLAM GANESH", "WorkedDays": 0.0, "OTHrsPrev": null, "BasicForDays": 0.0, "FixedAllowForDays": 0.0, "OTPay": 0.0, "Gross": 0.0, "DedSp": 0.0, "DedOthsAdvance": null, "NetSal": 0.0, "DedDort": null, "OtherAllowLump": 0.0, "Month": "2026-07-01", "EmpID": "E003"}, {"Name": "RAVICHANDRAN PRAKASH", "WorkedDays": 0.0, "OTHrsPrev": null, "BasicForDays": 0.0, "FixedAllowForDays": 0.0, "OTPay": 0.0, "Gross": 0.0, "DedSp": 8.38, "DedOthsAdvance": null, "NetSal": -27.130000000000003, "DedDort": 18.75, "OtherAllowLump": 0.0, "Month": "2026-07-01", "EmpID": "E074"}];

// ---------------------------------------------------------------------------
// SETUP (run once manually from the Apps Script editor)
// ---------------------------------------------------------------------------
function setupSpreadsheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // ---- Users ----
  let sh = getOrCreateSheet_(ss, SHEET_USERS);
  if (sh.getLastRow() === 0) {
    sh.appendRow(['Username', 'PasswordHash', 'Role', 'DisplayName', 'CreatedAt']);
    sh.appendRow(['owner', hashPw_('owner123'), 'Owner', 'Owner', new Date()]);
    sh.appendRow(['accountant', hashPw_('acc123'), 'Accountant', 'Accountant', new Date()]);
  }

  // ---- Employees ----
  sh = getOrCreateSheet_(ss, SHEET_EMPLOYEES);
  if (sh.getLastRow() === 0) {
    sh.appendRow(['EmpID', 'Name', 'Department', 'Status', 'DateJoined', 'DateExited',
                  'BasicRate', 'FixedAllowRate', 'FilmRate', 'OTRate', 'StandardInstalment', 'Notes']);
    SEED_EMPLOYEES.forEach(function (e) {
      sh.appendRow([e.EmpID, e.Name, '', 'Active', '', '',
                    e.Basic || 0, e.FixedAllow || 0, e.FilmRate || 0, e.OTRate || 0, '', '']);
    });
  }

  // ---- Advance Ledger ----
  sh = getOrCreateSheet_(ss, SHEET_LEDGER);
  if (sh.getLastRow() === 0) {
    sh.appendRow(['Date', 'EmpID', 'Name', 'Amount', 'Notes', 'EnteredBy', 'Timestamp']);
    SEED_LEDGER.forEach(function (l) {
      sh.appendRow([l.Date, l.EmpID, l.Name, l.Amount, l.Notes, 'system-migration', new Date()]);
    });
  }

  // ---- Payroll Data ----
  sh = getOrCreateSheet_(ss, SHEET_PAYROLL);
  if (sh.getLastRow() === 0) {
    sh.appendRow(['Month', 'EmpID', 'WorkedDays', 'OTHoursPrev', 'ExitFlag', 'AlsoPayCurrentOT',
                  'OTHoursCurrentExit', 'AllowancesJSON', 'OtherDeductionManual', 'Notes',
                  'BasicPay', 'FixedAllowPay', 'OTPay', 'AdvanceDeducted', 'Gross', 'TotalDeductions',
                  'NetPay', 'EnteredBy', 'Timestamp']);
    const empMap = {};
    SEED_EMPLOYEES.forEach(function (e) { empMap[e.EmpID] = e; });
    // Sort seed payroll chronologically so advance recovery accumulates correctly
    const monthRank = { '2026-05-01': 0, '2026-06-01': 1, '2026-07-01': 2 };
    SEED_PAYROLL.sort(function (a, b) { return monthRank[a.Month] - monthRank[b.Month]; });
    SEED_PAYROLL.forEach(function (p) {
      const monthStr = p.Month.substring(0, 7); // '2026-05-01' -> '2026-05'
      const otherDed = round2_((p.DedSp || 0) + (p.DedDort || 0));
      const allowLump = round2_(p.OtherAllowLump || 0);
      const allowancesJson = allowLump !== 0
        ? JSON.stringify([{ label: 'Other Allowances (historical, bus/transport/film/proj lump)', amount: allowLump }])
        : '[]';
      sh.appendRow([monthStr, p.EmpID, p.WorkedDays || 0, p.OTHrsPrev || 0, 'N', 'N', '',
                    allowancesJson, otherDed,
                    'Historical migration (auto-derived from original payroll file)',
                    round2_(p.BasicForDays || 0), round2_(p.FixedAllowForDays || 0), round2_(p.OTPay || 0),
                    round2_(p.DedOthsAdvance || 0), round2_(p.Gross || 0),
                    round2_(otherDed + (p.DedOthsAdvance || 0)), round2_(p.NetSal || 0),
                    'system-migration', new Date()]);
    });
  }

  // ---- Sessions ----
  sh = getOrCreateSheet_(ss, SHEET_SESSIONS);
  if (sh.getLastRow() === 0) {
    sh.appendRow(['Token', 'Username', 'Role', 'CreatedAt']);
  }

  // ---- Audit Log ----
  sh = getOrCreateSheet_(ss, SHEET_AUDIT);
  if (sh.getLastRow() === 0) {
    sh.appendRow(['Timestamp', 'Username', 'Action', 'Details']);
  }

  SpreadsheetApp.flush();
  Logger.log('Setup complete. Employees: %s, Ledger: %s, Payroll: %s',
    SEED_EMPLOYEES.length, SEED_LEDGER.length, SEED_PAYROLL.length);
}

function getOrCreateSheet_(ss, name) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  return sh;
}

function round2_(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// ---------------------------------------------------------------------------
// AUTH
// ---------------------------------------------------------------------------
function hashPw_(pw) {
  const raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, pw, Utilities.Charset.UTF_8);
  return raw.map(function (b) { return ('0' + (b & 0xFF).toString(16)).slice(-2); }).join('');
}

function login_(username, password) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_USERS);
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).toLowerCase() === String(username).toLowerCase()) {
      if (data[i][1] === hashPw_(password)) {
        const token = Utilities.getUuid();
        const sessSh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_SESSIONS);
        sessSh.appendRow([token, data[i][0], data[i][2], new Date()]);
        return { token: token, role: data[i][2], displayName: data[i][3] || data[i][0] };
      } else {
        throw new Error('Incorrect password.');
      }
    }
  }
  throw new Error('User not found.');
}

function changePassword_(token, newPassword) {
  const session = validateToken_(token);
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_USERS);
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === session.username) {
      sh.getRange(i + 1, 2).setValue(hashPw_(newPassword));
      return { ok: true };
    }
  }
  throw new Error('User not found.');
}

function validateToken_(token) {
  if (!token) throw new Error('Not logged in.');
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_SESSIONS);
  const data = sh.getDataRange().getValues();
  const now = new Date();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === token) {
      const created = new Date(data[i][2]);
      const hoursElapsed = (now - created) / (1000 * 60 * 60);
      if (hoursElapsed > SESSION_TTL_HOURS) throw new Error('Session expired. Please log in again.');
      return { username: data[i][1], role: data[i][2] };
    }
  }
  throw new Error('Invalid session. Please log in again.');
}

function requireRole_(token, allowedRoles) {
  const session = validateToken_(token);
  if (allowedRoles.indexOf(session.role) === -1) {
    throw new Error('You do not have permission to do this (requires: ' + allowedRoles.join(' or ') + ').');
  }
  return session;
}

function logAudit_(username, action, details) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_AUDIT);
  sh.appendRow([new Date(), username, action, JSON.stringify(details)]);
}

// ---------------------------------------------------------------------------
// SHEET <-> OBJECT HELPERS
// ---------------------------------------------------------------------------
function sheetToObjects_(sheetName) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  const data = sh.getDataRange().getValues();
  if (data.length < 1) return [];
  const headers = data[0];
  const rows = [];
  for (let i = 1; i < data.length; i++) {
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      let v = data[i][j];
      if (v instanceof Date) v = Utilities.formatDate(v, Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss");
      obj[headers[j]] = v;
    }
    obj._row = i + 1; // 1-based sheet row, useful for updates
    rows.push(obj);
  }
  return rows;
}

// ---------------------------------------------------------------------------
// EMPLOYEES
// ---------------------------------------------------------------------------
function getEmployees_() {
  return sheetToObjects_(SHEET_EMPLOYEES);
}

function saveEmployee_(token, emp) {
  const session = requireRole_(token, ['Owner']);
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_EMPLOYEES);
  const data = sh.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.indexOf('EmpID');
  let targetRow = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][idCol] === emp.EmpID) { targetRow = i + 1; break; }
  }
  const rowValues = headers.map(function (h) { return emp[h] !== undefined ? emp[h] : ''; });
  if (targetRow === -1) {
    sh.appendRow(rowValues);
  } else {
    sh.getRange(targetRow, 1, 1, headers.length).setValues([rowValues]);
  }
  logAudit_(session.username, 'saveEmployee', emp);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// ADVANCE LEDGER (Owner only to view/add) + BALANCES (both roles can view)
// ---------------------------------------------------------------------------
function getAdvanceLedger_(token) {
  requireRole_(token, ['Owner']);
  return sheetToObjects_(SHEET_LEDGER);
}

function addAdvanceEntry_(token, entry) {
  const session = requireRole_(token, ['Owner']);
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_LEDGER);
  const emp = getEmployees_().find(function (e) { return e.EmpID === entry.EmpID; });
  sh.appendRow([entry.Date, entry.EmpID, emp ? emp.Name : '', entry.Amount, entry.Notes || '',
                session.username, new Date()]);
  logAudit_(session.username, 'addAdvanceEntry', entry);
  return { ok: true };
}

function getAdvanceBalances_(token) {
  requireRole_(token, ['Owner', 'Accountant']);
  const employees = getEmployees_();
  const ledger = sheetToObjects_(SHEET_LEDGER);
  const payroll = sheetToObjects_(SHEET_PAYROLL);

  return employees.map(function (emp) {
    const given = ledger
      .filter(function (l) { return l.EmpID === emp.EmpID; })
      .reduce(function (s, l) { return s + (Number(l.Amount) || 0); }, 0);
    const recovered = payroll
      .filter(function (p) { return p.EmpID === emp.EmpID; })
      .reduce(function (s, p) { return s + (Number(p.AdvanceDeducted) || 0); }, 0);
    return {
      EmpID: emp.EmpID,
      Name: emp.Name,
      TotalGiven: round2_(given),
      TotalRecovered: round2_(recovered),
      Outstanding: round2_(given - recovered)
    };
  });
}

// ---------------------------------------------------------------------------
// PAYROLL DATA — the core monthly-entry engine
// ---------------------------------------------------------------------------

// How much is currently OWED as of `monthStr` ('YYYY-MM') for one employee,
// given all ledger entries and all OTHER payroll rows already recorded for
// strictly earlier months. Recovery in earlier months always reduces this,
// regardless of what THIS month's entry says.
function outstandingBalanceAt_(empId, monthStr, ledgerRows, existingPayrollRows) {
  const monthEnd = monthStr + '-31'; // lexical date compare is safe for YYYY-MM-DD strings
  const givenToDate = ledgerRows
    .filter(function (l) { return l.EmpID === empId && String(l.Date).substring(0, 10) <= monthEnd; })
    .reduce(function (s, l) { return s + (Number(l.Amount) || 0); }, 0);

  const recoveredBefore = existingPayrollRows
    .filter(function (p) { return p.EmpID === empId && String(p.Month) < monthStr; })
    .reduce(function (s, p) { return s + (Number(p.AdvanceDeducted) || 0); }, 0);

  return round2_(givenToDate - recoveredBefore);
}

// SUGGESTED advance deduction for a month — shown to the accountant as a
// pre-filled default. They can edit it (see computePayrollRow_ below); this
// function itself never writes anything.
function suggestedAdvanceDue_(empId, monthStr, employee, ledgerRows, existingPayrollRows) {
  const outstanding = outstandingBalanceAt_(empId, monthStr, ledgerRows, existingPayrollRows);
  if (outstanding <= 0) return 0;
  const instalment = Number(employee.StandardInstalment) || 0;
  if (!instalment) return round2_(outstanding);
  return round2_(Math.min(outstanding, instalment));
}

function daysInMonth_(monthStr) {
  const parts = monthStr.split('-');
  const y = Number(parts[0]), m = Number(parts[1]);
  return new Date(y, m, 0).getDate();
}

// Parse the flexible allowances list. Accepts either a JSON string
// (as stored in the sheet) or an already-parsed array (as sent by the
// frontend). Each item: { label: string, amount: number }.
function parseAllowances_(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function sumAllowances_(list) {
  return round2_(list.reduce(function (s, a) { return s + (Number(a.amount) || 0); }, 0));
}

// Full computation for one payroll entry. Returns the computed fields.
// Basic pay, allowance pay, and OT pay are always computed from worked
// days/rates — the accountant cannot override those. The ADVANCE DEDUCTED
// figure, however, is whatever the accountant enters (input.AdvanceDeducted),
// validated so it can never exceed what's actually still outstanding on the
// ledger. If the accountant leaves it blank/undefined, the suggested amount
// is used. Whatever ends up here is exactly what reduces the ledger balance
// going forward — enter 0 to skip a month's recovery, enter less than
// suggested to partially recover, etc.
function computePayrollRow_(input, employee, ledgerRows, existingPayrollRows) {
  const dim = daysInMonth_(input.Month);
  const workedDays = Number(input.WorkedDays) || 0;
  const otHoursPrev = Number(input.OTHoursPrev) || 0;
  const otHoursCurrExit = Number(input.OTHoursCurrentExit) || 0;
  // Accept either the raw array (fresh save from the form/bulk upload) or the
  // stored JSON string (when re-computing an existing row, e.g. during
  // recalculateAllPayroll_) — whichever is present.
  const allowances = parseAllowances_(input.Allowances !== undefined ? input.Allowances : input.AllowancesJSON);
  const allowancesTotal = sumAllowances_(allowances);
  const otherDed = Number(input.OtherDeductionManual) || 0;

  const basicRate = Number(employee.BasicRate) || 0;
  const allowRate = Number(employee.FixedAllowRate) || 0;
  const otRate = Number(employee.OTRate) || 0;

  const basicPay = round2_((basicRate / dim) * workedDays);
  const fixedAllowPay = round2_((allowRate / dim) * workedDays);
  const otPayPrev = round2_(otHoursPrev * otRate);
  const otPayCurrExit = (input.ExitFlag === 'Y' && input.AlsoPayCurrentOT === 'Y') ? round2_(otHoursCurrExit * otRate) : 0;
  const totalOTPay = round2_(otPayPrev + otPayCurrExit);

  const outstanding = outstandingBalanceAt_(employee.EmpID, input.Month, ledgerRows, existingPayrollRows);
  let advanceDeducted;
  if (input.AdvanceDeducted === undefined || input.AdvanceDeducted === null || input.AdvanceDeducted === '') {
    advanceDeducted = suggestedAdvanceDue_(employee.EmpID, input.Month, employee, ledgerRows, existingPayrollRows);
  } else {
    advanceDeducted = round2_(Number(input.AdvanceDeducted) || 0);
    if (advanceDeducted < 0) {
      throw new Error('Advance deducted cannot be negative.');
    }
    if (advanceDeducted > outstanding + 0.01) {
      throw new Error('Advance deducted (' + advanceDeducted + ') cannot exceed ' + employee.Name +
        "'s outstanding balance of " + outstanding + '. Lower the amount or record a new advance first.');
    }
  }

  const gross = round2_(basicPay + fixedAllowPay + totalOTPay + allowancesTotal);
  const totalDeductions = round2_(advanceDeducted + otherDed);
  const netPay = round2_(gross - totalDeductions);

  return {
    Month: input.Month,
    EmpID: employee.EmpID,
    WorkedDays: workedDays,
    OTHoursPrev: otHoursPrev,
    ExitFlag: input.ExitFlag || 'N',
    AlsoPayCurrentOT: input.AlsoPayCurrentOT || 'N',
    OTHoursCurrentExit: otHoursCurrExit,
    AllowancesJSON: JSON.stringify(allowances),
    OtherDeductionManual: otherDed,
    Notes: input.Notes || '',
    BasicPay: basicPay,
    FixedAllowPay: fixedAllowPay,
    OTPay: totalOTPay,
    AdvanceDeducted: advanceDeducted,
    Gross: gross,
    TotalDeductions: totalDeductions,
    NetPay: netPay
  };
}

// Returns the suggested advance amount + current outstanding balance for one
// employee/month, so the frontend can pre-fill the (now editable) field.
function getSuggestedAdvance_(token, empId, month) {
  requireRole_(token, ['Owner', 'Accountant']);
  const employees = getEmployees_();
  const employee = employees.find(function (e) { return e.EmpID === empId; });
  if (!employee) throw new Error('Employee not found: ' + empId);
  const ledgerRows = sheetToObjects_(SHEET_LEDGER);
  const payroll = sheetToObjects_(SHEET_PAYROLL).filter(function (p) { return p.EmpID === empId; });
  const outstanding = outstandingBalanceAt_(empId, month, ledgerRows, payroll);
  const suggested = suggestedAdvanceDue_(empId, month, employee, ledgerRows, payroll);
  return { outstanding: outstanding, suggested: suggested };
}

function getPayrollData_(token, month) {
  requireRole_(token, ['Owner', 'Accountant']);
  const rows = sheetToObjects_(SHEET_PAYROLL);
  if (month) return rows.filter(function (r) { return r.Month === month; });
  return rows;
}

// Save (insert or update) one employee's payroll entry for one month.
// Recomputes every derived field server-side — the client cannot pass in
// its own Gross/Net/AdvanceDeducted; only raw inputs are trusted.
function savePayrollEntry_(token, input) {
  const session = requireRole_(token, ['Owner', 'Accountant']);
  const employees = getEmployees_();
  const employee = employees.find(function (e) { return e.EmpID === input.EmpID; });
  if (!employee) throw new Error('Employee not found: ' + input.EmpID);

  const ledgerRows = sheetToObjects_(SHEET_LEDGER);
  const allPayroll = sheetToObjects_(SHEET_PAYROLL);
  const existingForOtherMonths = allPayroll.filter(function (p) { return p.EmpID === input.EmpID; });

  const computed = computePayrollRow_(input, employee, ledgerRows, existingForOtherMonths);

  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_PAYROLL);
  const data = sh.getDataRange().getValues();
  const headers = data[0];
  let targetRow = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === input.Month && data[i][1] === input.EmpID) { targetRow = i + 1; break; }
  }
  const rowValues = headers.map(function (h) {
    if (h === 'EnteredBy') return session.username;
    if (h === 'Timestamp') return new Date();
    return computed[h] !== undefined ? computed[h] : '';
  });
  if (targetRow === -1) {
    sh.appendRow(rowValues);
  } else {
    sh.getRange(targetRow, 1, 1, headers.length).setValues([rowValues]);
  }
  logAudit_(session.username, 'savePayrollEntry', input);
  return computed;
}

// Bulk save — used by the Excel upload feature. Accepts an array of raw
// entries (one per employee) for potentially-mixed months, computes each one
// server-side (same validation as a single save — an advance override that
// exceeds someone's outstanding balance fails that row, not the whole batch),
// and writes everything in as few sheet operations as possible.
// Returns { saved: [...], errors: [{EmpID, Month, error}, ...] }.
function savePayrollBulk_(token, entries) {
  const session = requireRole_(token, ['Owner', 'Accountant']);
  const employees = getEmployees_();
  const empMap = {};
  employees.forEach(function (e) { empMap[e.EmpID] = e; });

  const ledgerRows = sheetToObjects_(SHEET_LEDGER);
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_PAYROLL);
  const data = sh.getDataRange().getValues();
  const headers = data[0];
  const existingRows = sheetToObjects_(SHEET_PAYROLL); // working copy we mutate/append to as we go
  const rowIndexOf = {}; // 'Month|EmpID' -> 1-based sheet row number (if it already existed on disk)
  for (let i = 1; i < data.length; i++) {
    rowIndexOf[data[i][0] + '|' + data[i][1]] = i + 1;
  }

  entries.sort(function (a, b) { return String(a.Month).localeCompare(String(b.Month)); });

  const saved = [];
  const errors = [];
  const toAppend = [];
  const updates = []; // {row, values}

  entries.forEach(function (input) {
    const employee = empMap[input.EmpID];
    if (!employee) { errors.push({ EmpID: input.EmpID, Month: input.Month, error: 'Employee not found' }); return; }
    try {
      const otherForEmp = existingRows.filter(function (p) { return p.EmpID === input.EmpID; });
      const computed = computePayrollRow_(input, employee, ledgerRows, otherForEmp);
      computed.EnteredBy = session.username;
      computed.Timestamp = new Date();

      const key = input.Month + '|' + input.EmpID;
      const rowValues = headers.map(function (h) { return computed[h] !== undefined ? computed[h] : ''; });

      if (rowIndexOf[key]) {
        updates.push({ row: rowIndexOf[key], values: rowValues });
      } else {
        toAppend.push(rowValues);
      }
      // Reflect this row into our in-memory working set so later rows in the
      // same batch (e.g. a later month for the same employee) see it.
      const idx = existingRows.findIndex(function (p) { return p.EmpID === input.EmpID && p.Month === input.Month; });
      if (idx !== -1) existingRows[idx] = computed; else existingRows.push(computed);

      saved.push({ EmpID: input.EmpID, Month: input.Month, NetPay: computed.NetPay });
    } catch (err) {
      errors.push({ EmpID: input.EmpID, Month: input.Month, error: err.message });
    }
  });

  updates.forEach(function (u) { sh.getRange(u.row, 1, 1, headers.length).setValues([u.values]); });
  if (toAppend.length) {
    sh.getRange(sh.getLastRow() + 1, 1, toAppend.length, headers.length).setValues(toAppend);
  }

  logAudit_(session.username, 'savePayrollBulk', { count: entries.length, saved: saved.length, errors: errors.length });
  return { saved: saved, errors: errors };
}

// Owner-only utility: recompute the ENTIRE Payroll Data sheet in chronological
// order. Use this after correcting an advance-ledger amount or an old entry,
// so advance recovery cascades correctly through every later month.
function recalculateAllPayroll_(token) {
  const session = requireRole_(token, ['Owner']);
  const employees = getEmployees_();
  const empMap = {};
  employees.forEach(function (e) { empMap[e.EmpID] = e; });
  const ledgerRows = sheetToObjects_(SHEET_LEDGER);
  let rows = sheetToObjects_(SHEET_PAYROLL);
  rows.sort(function (a, b) { return String(a.Month).localeCompare(String(b.Month)); });

  const recomputed = [];
  rows.forEach(function (r) {
    const emp = empMap[r.EmpID];
    if (!emp) return;
    const computed = computePayrollRow_(r, emp, ledgerRows, recomputed);
    computed.EnteredBy = r.EnteredBy;
    computed.Timestamp = r.Timestamp;
    recomputed.push(computed);
  });

  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_PAYROLL);
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  sh.getRange(2, 1, sh.getMaxRows() - 1, headers.length).clearContent();
  const rowValues = recomputed.map(function (c) {
    return headers.map(function (h) { return c[h] !== undefined ? c[h] : ''; });
  });
  if (rowValues.length) sh.getRange(2, 1, rowValues.length, headers.length).setValues(rowValues);
  logAudit_(session.username, 'recalculateAllPayroll', { rows: rowValues.length });
  return { ok: true, rowsRecalculated: rowValues.length };
}

// ---------------------------------------------------------------------------
// MONTHLY OVERVIEW & SPIKE DETECTION
// ---------------------------------------------------------------------------
function getMonthlyOverview_(token) {
  requireRole_(token, ['Owner', 'Accountant']);
  const employees = getEmployees_();
  const payroll = sheetToObjects_(SHEET_PAYROLL);
  const months = Array.from(new Set(payroll.map(function (p) { return p.Month; }))).sort();

  return employees.map(function (emp) {
    const byMonth = {};
    months.forEach(function (m) {
      const row = payroll.find(function (p) { return p.EmpID === emp.EmpID && p.Month === m; });
      byMonth[m] = row ? { WorkedDays: Number(row.WorkedDays) || 0, NetPay: Number(row.NetPay) || 0 } : null;
    });

    const changes = [];
    for (let i = 1; i < months.length; i++) {
      const prev = byMonth[months[i - 1]], cur = byMonth[months[i]];
      if (!prev || !cur) continue;
      const pctChange = prev.NetPay !== 0 ? (cur.NetPay - prev.NetPay) / prev.NetPay : null;
      const wdDiff = cur.WorkedDays - prev.WorkedDays;
      let flag;
      if (pctChange === null) {
        flag = 'N/A';
      } else if (prev.WorkedDays === 0 || cur.WorkedDays === 0 || Math.abs(wdDiff) >= 8) {
        flag = 'Leave/attendance-driven — not a spike';
      } else if (Math.abs(wdDiff) < 5 && Math.abs(pctChange) > 0.30) {
        flag = pctChange > 0 ? 'TRUE SPIKE UP — investigate' : 'TRUE SPIKE DOWN — investigate';
      } else {
        flag = 'Stable';
      }
      changes.push({ from: months[i - 1], to: months[i], pctChange: pctChange, flag: flag });
    }

    return { EmpID: emp.EmpID, Name: emp.Name, byMonth: byMonth, changes: changes };
  });
}

// ---------------------------------------------------------------------------
// OT & BASIC PAID TRACKER
// ---------------------------------------------------------------------------
function getOTBasicTracker_(token) {
  requireRole_(token, ['Owner', 'Accountant']);
  const employees = getEmployees_();
  const payroll = sheetToObjects_(SHEET_PAYROLL);
  const months = Array.from(new Set(payroll.map(function (p) { return p.Month; }))).sort();

  return employees.map(function (emp) {
    const byMonth = {};
    months.forEach(function (m) {
      const row = payroll.find(function (p) { return p.EmpID === emp.EmpID && p.Month === m; });
      if (!row) { byMonth[m] = null; return; }
      const basicPaid = (Number(row.BasicPay) || 0) > 0;
      const otPaid = (Number(row.OTPay) || 0) > 0;
      let status;
      if (basicPaid && otPaid) status = 'Both Basic & OT';
      else if (basicPaid) status = 'Basic Only';
      else if (otPaid) status = 'OT Only (no Basic this month)';
      else status = 'Neither paid';
      byMonth[m] = { basicPaid: basicPaid, otPaid: otPaid, status: status };
    });
    return { EmpID: emp.EmpID, Name: emp.Name, byMonth: byMonth };
  });
}

// ---------------------------------------------------------------------------
// EXIT LOG
// ---------------------------------------------------------------------------
function getExitLog_(token) {
  requireRole_(token, ['Owner', 'Accountant']);
  const payroll = sheetToObjects_(SHEET_PAYROLL);
  const employees = getEmployees_();
  const empMap = {};
  employees.forEach(function (e) { empMap[e.EmpID] = e; });
  return payroll
    .filter(function (p) { return p.ExitFlag === 'Y'; })
    .map(function (p) {
      return {
        Month: p.Month, EmpID: p.EmpID, Name: empMap[p.EmpID] ? empMap[p.EmpID].Name : '',
        AlsoPayCurrentOT: p.AlsoPayCurrentOT, OTHoursCurrentExit: p.OTHoursCurrentExit,
        BasicPay: p.BasicPay, OTPay: p.OTPay, NetPay: p.NetPay, Notes: p.Notes
      };
    });
}

// ---------------------------------------------------------------------------
// DEPARTMENT SUMMARY
// ---------------------------------------------------------------------------
function getDeptSummary_(token) {
  requireRole_(token, ['Owner', 'Accountant']);
  const employees = getEmployees_();
  const payroll = sheetToObjects_(SHEET_PAYROLL);
  const empMap = {};
  employees.forEach(function (e) { empMap[e.EmpID] = e; });
  const months = Array.from(new Set(payroll.map(function (p) { return p.Month; }))).sort();

  const depts = Array.from(new Set(employees.map(function (e) { return e.Department || '(Unassigned)'; })));

  return depts.map(function (dept) {
    const byMonth = {};
    months.forEach(function (m) {
      const rows = payroll.filter(function (p) {
        const emp = empMap[p.EmpID];
        return p.Month === m && emp && (emp.Department || '(Unassigned)') === dept;
      });
      byMonth[m] = {
        headcount: rows.length,
        totalGross: round2_(rows.reduce(function (s, r) { return s + (Number(r.Gross) || 0); }, 0)),
        totalNet: round2_(rows.reduce(function (s, r) { return s + (Number(r.NetPay) || 0); }, 0)),
        totalAdvanceRecovered: round2_(rows.reduce(function (s, r) { return s + (Number(r.AdvanceDeducted) || 0); }, 0))
      };
    });
    return { department: dept, byMonth: byMonth };
  });
}

// ---------------------------------------------------------------------------
// HTTP ENTRY POINTS
// ---------------------------------------------------------------------------
function doGet(e) {
  return jsonOut_({ ok: true, message: 'MSE Tech Payroll API is running.' });
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;
    const token = body.token;
    let result;

    switch (action) {
      case 'login':
        result = login_(body.username, body.password);
        break;
      case 'changePassword':
        result = changePassword_(token, body.newPassword);
        break;
      case 'getEmployees':
        requireRole_(token, ['Owner', 'Accountant']);
        result = getEmployees_();
        break;
      case 'saveEmployee':
        result = saveEmployee_(token, body.employee);
        break;
      case 'getAdvanceLedger':
        result = getAdvanceLedger_(token);
        break;
      case 'addAdvanceEntry':
        result = addAdvanceEntry_(token, body.entry);
        break;
      case 'getAdvanceBalances':
        result = getAdvanceBalances_(token);
        break;
      case 'getPayrollData':
        result = getPayrollData_(token, body.month);
        break;
      case 'savePayrollEntry':
        result = savePayrollEntry_(token, body.entry);
        break;
      case 'savePayrollBulk':
        result = savePayrollBulk_(token, body.entries);
        break;
      case 'getSuggestedAdvance':
        result = getSuggestedAdvance_(token, body.empId, body.month);
        break;
      case 'recalculateAllPayroll':
        result = recalculateAllPayroll_(token);
        break;
      case 'getMonthlyOverview':
        result = getMonthlyOverview_(token);
        break;
      case 'getOTBasicTracker':
        result = getOTBasicTracker_(token);
        break;
      case 'getExitLog':
        result = getExitLog_(token);
        break;
      case 'getDeptSummary':
        result = getDeptSummary_(token);
        break;
      default:
        throw new Error('Unknown action: ' + action);
    }
    return jsonOut_({ ok: true, data: result });
  } catch (err) {
    return jsonOut_({ ok: false, error: err.message });
  }
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
