"""
field_import.py - Baghewala Field Telemetry CSV Data Importer and Parser.
Parses, cleans, and validates field operation logs:
Date, Oil_Rate_BOPD, Water_Cut, Downhole_Temp_C, Surface_Pressure_bar, SPM, Stroke_in, Steam_Injected_t
Supports automatic header mapping and unit conversion.
"""

import io
import csv
from typing import Dict, Any, List

class FieldDataImporter:
    REQUIRED_COLUMNS = ["date", "oil_rate_bpd", "water_cut", "temp_c", "spm", "stroke_in"]

    def __init__(self):
        pass

    def parse_csv(self, csv_text: str) -> Dict[str, Any]:
        """
        Parses CSV string, normalizes headers, validates physical bounds, and extracts rows.
        """
        reader = csv.DictReader(io.StringIO(csv_text.strip()))
        if not reader.fieldnames:
            return {"success": False, "error": "Empty CSV or no header row found"}

        # Normalize field names to lowercase without spaces/punctuation
        header_map = {}
        for h in reader.fieldnames:
            norm = h.lower().strip().replace(" ", "_").replace("-", "_").replace("(", "").replace(")", "")
            header_map[h] = norm

        parsed_rows: List[Dict[str, Any]] = []
        validation_errors: List[str] = []

        row_num = 1
        for raw_row in reader:
            row_num += 1
            row = {header_map[k]: v.strip() for k, v in raw_row.items() if k in header_map}

            try:
                oil_bpd = float(row.get("oil_rate_bpd", row.get("oil_bpd", row.get("oil_rate", 0.0))))
                wc = float(row.get("water_cut", row.get("watercut", 0.12)))
                temp = float(row.get("temp_c", row.get("temperature", 52.0)))
                spm = float(row.get("spm", row.get("pumping_speed", 3.0)))
                stroke = float(row.get("stroke_in", row.get("stroke", 64.0)))
                steam_t = float(row.get("steam_t", row.get("steam_injected_t", 0.0)))
                date_str = row.get("date", f"Day_{row_num}")

                # Physical range validation
                if oil_bpd < 0.0 or oil_bpd > 500.0:
                    validation_errors.append(f"Row {row_num}: Oil rate {oil_bpd} out of physical range [0, 500]")
                if wc < 0.0 or wc > 1.0:
                    wc = wc / 100.0 if wc <= 100.0 else 0.15 # Normalize percent to fraction

                parsed_rows.append({
                    "date": date_str,
                    "oil_rate_bpd": round(oil_bpd, 1),
                    "water_cut": round(wc, 3),
                    "temp_c": round(temp, 1),
                    "spm": round(spm, 2),
                    "stroke_in": round(stroke, 1),
                    "steam_injected_t": round(steam_t, 1)
                })
            except Exception as e:
                validation_errors.append(f"Row {row_num}: parse error {str(e)}")

        return {
            "success": len(parsed_rows) > 0 and len(validation_errors) < 5,
            "rows_parsed": len(parsed_rows),
            "errors": validation_errors,
            "records": parsed_rows
        }
