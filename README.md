# 📦 Punk Versandkostenrechner

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![Status](https://img.shields.io/badge/status-active-success.svg)
![Last Update](https://img.shields.io/badge/last%20update-März%202025-orange)

> **Eine offene, maschinenlesbare JSON-Datenbank für aktuelle deutsche Versandtarife.**

**-> [Hier direkt ausprobieren!](https://c-hoffmann.github.io/shipping/) <-**

Dieses Repository beinhaltet die Datenbasis für den **Punk Shipping Calculator**. Es stellt Preise, Maße und Gewichtsbeschränkungen der gängigsten deutschen Versanddienstleister in einem einheitlichen JSON-Format zur Verfügung. Ideal für E-Commerce-Projekte, Versandkostenrechner oder Vergleichsportale.

---

## 🚀 Features

*   **Aktuell:** Berücksichtigt die Preisanpassungen 2025/2026.
*   **Umfassend:** Enthält Briefe, Päckchen, Pakete und Sperrgut.
*   **Detailliert:** Inklusive Min-/Max-Maßen, Gurtmaßen und Versicherungsangaben.
*   **Ready-to-use:** Einfaches JSON-Format für direkte Integration in JS, Python, PHP, etc.

## 🚚 Unterstützte Dienstleister

| Logo | Dienstleister | Typen |
| :---: | :--- | :--- |
| 🟡 | **Deutsche Post** | Standard-, Kompakt-, Groß-, Maxibriefe, Warensendungen |
| 🔴 | **DHL** | Päckchen (S/M), Pakete (bis 31,5kg), Sperrgut |
| 🔵 | **Hermes** | Päckchen, Pakete (S-XXL) |
| 🔵 | **GLS** | Pack (XS-XL) |
| 🟢 | **Arriva** | Briefversand (Regional/Südwest) |

---

## 🛠 Nutzung

### 1. Direktzugriff (Raw Git)
Du kannst die Daten direkt über die Raw-URL von GitHub in deine Anwendung laden, um immer die aktuellste Version zu haben:

```javascript
const url = 'https://raw.githubusercontent.com/DEIN_USER/DEIN_REPO/main/data.json';

fetch(url)
  .then(res => res.json())
  .then(data => {
    console.log("Versandarten geladen:", data.items.length);
  });
```

### 2. Einbindung in dein Projekt
Lade die Datei herunter oder klone das Repo:

```bash
git clone https://github.com/DEIN_USER/DEIN_REPO.git
```

---

## 📄 Datenstruktur

Die Hauptdatei ist ein JSON-Objekt mit Metadaten und einem Array aus `items`.

```json
{
  "_version": "2.0.0",
  "items": [
    {
      "internal_name": "dhl_2kg_paket",   // Eindeutige ID
      "title": "Paket 2kg",               // Anzeigename
      "company": "DHL",                   // Dienstleister
      "price": "06.19",                   // Preis in EUR (String)
      "minimalsizes": "15cm × 11cm × 1cm",// Min. Maße (Display)
      "maximalsizes": "60cm × 30cm × 15cm",// Max. Maße (Display)
      "_longestandshortestside": false,   // Spezielle Regel (z.B. Hermes)
      "maximalweight": "2kg",             // Max. Gewicht
      "insurance": "500,00",              // Versicherungswert (wenn inkl.)
      "weblink": "..."                    // Link zur Buchung
    }
    // ... weitere Einträge
  ]
}
```

### Besonderheiten bei den Feldern
*   **`price`**: Immer als String formatiert (z.B. `"04.50"`), um Floating-Point-Fehler zu vermeiden.
*   **`_longestandshortestside`**: 
    *   `false`: Es gelten klassische L x B x H Grenzen.
    *   `"Zahl"` (z.B. "50"): Bei Hermes/GLS zählt oft die Summe aus längster und kürzester Seite.
*   **`conditions`**: Enthält wichtige Hinweise wie "Nur Online buchbar" oder "Filialpreis abweichend".

---

## 🤝 Mitwirken (Contributing)

Versandpreise ändern sich leider ständig (siehe Januar 2025). 
Wenn du einen Fehler findest oder sich ein Preis geändert hat:

1.  Forke das Repository.
2.  Aktualisiere die Werte in der JSON-Datei.
3.  Erstelle einen **Pull Request**.

Bitte prüfe die Angaben immer gegen die aktuellen Preislisten der Dienstleister (Links meist in der `weblink` Property).

---

## ⚖️ Disclaimer

*Dies ist ein privates Open-Source-Projekt. Alle Angaben sind ohne Gewähr. Die genannten Marken (DHL, Hermes, etc.) gehören ihren jeweiligen Eigentümern. Wir stehen in keiner direkten Verbindung zu den genannten Unternehmen.*

---

<div align="center">
  <sub>Built for the Punks. 🤘</sub>
</div>
