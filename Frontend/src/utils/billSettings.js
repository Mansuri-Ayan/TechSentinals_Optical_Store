export const defaultSettings = {
  headerText: "TechSentinals Optical Store",
  subHeaderText: "Tax Invoice / Receipt",
  contactEmail: "info@techsentinals.com",
  contactPhone: "9876543210",
  address: "123, Optical Plaza, Main Road",
  city: "Mumbai",
  state: "Maharashtra",
  pincode: "400001",
  gstNumber: "27AAAAA1111A1Z1",
  footerText: "Thank you for shopping with us! Please visit again.",
  themeColor: "#10B981", // default emerald
  showPrescription: true,
  showGst: true,
  logo: null, // base64 string
  qrCode: null, // base64 string
};

export const getBillTemplateSettings = (storeId) => {
  const saved = localStorage.getItem(`bill_template_settings_${storeId || 'default'}`);
  if (saved) {
    try {
      return { ...defaultSettings, ...JSON.parse(saved) };
    } catch {
      return defaultSettings;
    }
  }
  return defaultSettings;
};

export const saveBillTemplateSettings = (storeId, settings) => {
  localStorage.setItem(`bill_template_settings_${storeId || 'default'}`, JSON.stringify(settings));
};
