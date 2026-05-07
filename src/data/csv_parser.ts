import { Client, BillingProfile } from '../types';

export const parseClientsFromCSV = (csvData: string[]): { clients: Client[], billingProfiles: BillingProfile[] } => {
  const clients: Client[] = [];
  const billingProfiles: BillingProfile[] = [];

  csvData.forEach(line => {
    if (!line || line.trim() === '') return;
    
    // Simple split by semicolon, handling quoted values is complex but for this dataset 
    // we can try a regex or a simple split if quotes are rare/consistent.
    // Given the data, we might need a robust split.
    
    const parts: string[] = [];
    let current = '';
    let inQuote = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuote = !inQuote;
      } else if (char === ';' && !inQuote) {
        parts.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    parts.push(current.trim());

    // Mapping based on analysis:
    // 0: ID
    // 2: Contact (Name)
    // 4: VAT (N° d'identification fiscale)
    // 5: City
    // 6: Zip
    // 7: Street
    // 8: Country
    // 11: Email
    // 14: Phone
    // 25: Client Number

    if (parts.length < 3) return;

    const id = parts[0];
    const name = parts[2].replace(/^"|"$/g, ''); // Remove surrounding quotes if any
    // const vat = parts[3]; // Column 3 seems to be VAT/Fiscal based on header "N° d'identification fiscale"
    // Wait, in row 17: "LU23206037" is at index 4?
    // Let's re-verify index.
    // 0: 17
    // 1: 43745382
    // 2: A.M. HAMALUX...
    // 3: A.M. HAMALUX... (Duplicate?)
    // 4: LU23206037
    
    // In row 1:
    // 0: 1
    // 1: 53225607
    // 2: (C.L.I.C.) S.A.
    // 3: Compagnie...
    // 4: (Empty)
    
    // So VAT is index 4.
    const vatNumber = parts[4];
    
    const city = parts[5];
    const zip = parts[6];
    const street = parts[7];
    const country = parts[8];
    
    const address = [street, zip, city, country].filter(Boolean).join(', ');
    
    const email = parts[11];
    const phone = parts[14];
    const clientNumber = parts[25];

    if (name) {
        clients.push({
            id,
            name,
            phone: phone || '',
            email: email || '',
            default_address: address,
            clientNumber: clientNumber || id
        });

        billingProfiles.push({
            id,
            companyName: name,
            address: address,
            vatNumber: vatNumber,
            email: email,
            phone: phone
        });
    }
  });

  return { clients, billingProfiles };
};
