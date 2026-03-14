db.createCollection('DeviceFirmware', { capped: false });
db.DeviceFirmware.insertMany([
  {
    _id: ObjectId("661d8a7540cb84cb4ed99244"),
    firmware_id: "HM_Prod_1.0.0_2.0.1",
    firmware_desc: "Prod - Haptic Module - 585: v1.0.0, NRF: v2.0.1 - build Aug 24, 2024",
    source: "GLG",
    dl_tag: "HM_repo/tag/v1.0"
  },
  {
    _id: ObjectId("661d8a7540cb84cb4ed99246"),
    firmware_id: "CM_Prod_1.0.0_2.2.1",
    firmware_desc: "Prod - Communication Module - 585: v1.0.0, NRF: v2.2.1 - build Aug 21, 2024",
    source: "GLG",
    dl_tag: "CM_repo/tag/v1.0"
  },
  {
    _id: ObjectId("661d8a7540cb84cb4ed99247"),
    firmware_id: "GW_Prod_1.0.0_2.2.1_89.32.0",
    firmware_desc: "Prod - Gateway - 585: v1.0.0, NRF: v2.2.1, HL7800: v89.32.0 - build Jan 03, 2012",
    source: "GLG",
    dl_tag: "GW_repo/tag/v1.0"
  },
  {
    _id: ObjectId("661d8a7540cb84cb4ed99248"),
    firmware_id: "HM_DEV_2.0.0_2.0.1",
    firmware_desc: "Dev - Haptic Module - 585: v2.0.0, NRF: v2.0.1 - build Sept 13, 2024",
    source: "GH",
    dl_tag: "HM_repo/tag/v2.0"
  },
  {
    _id: ObjectId("661d8a7540cb84cb4ed99249"),
    firmware_id: "RS_Prod_1.0.0_2.2.1",
    firmware_desc: "Prod - Receptor Sole - 585: v1.0.0, NRF: v2.2.1 - build March 03, 2024",
    source: "GLG",
    dl_tag: "RS_repo/tag/v1.0"
  },
  {
    _id: ObjectId("661d8a7540cb84cb4ed9924a"),
    firmware_id: "GW_Prod_1.1.0_2.3.0_89.35.1",
    firmware_desc: "Prod - Gateway - 585: v1.1.0, NRF: v2.3.0, HL7800: v89.35.1 - build Oct 15, 2024",
    source: "GLG",
    dl_tag: "GW_repo/tag/v1.1"
  },
  {
    _id: ObjectId("661d8a7540cb84cb4ed9924b"),
    firmware_id: "HM_DEV_2.1.0_2.1.2",
    firmware_desc: "Dev - Haptic Module - 585: v2.1.0, NRF: v2.1.2 - build Nov 08, 2024",
    source: "GH",
    dl_tag: "HM_repo/tag/v2.1"
  },
  {
    _id: ObjectId("661d8a7540cb84cb4ed9924c"),
    firmware_id: "RS_DEV_1.2.0_2.4.0",
    firmware_desc: "Dev - Receptor Sole - 585: v1.2.0, NRF: v2.4.0 - build Dec 01, 2024",
    source: "GH",
    dl_tag: "RS_repo/tag/v1.2"
  },
  {
    _id: ObjectId("661d8a7540cb84cb4ed9924d"),
    firmware_id: "GW_DEV_1.3.0_2.5.0_90.12.3",
    firmware_desc: "Dev - Gateway - 585: v1.3.0, NRF: v2.5.0, HL7800: v90.12.3 - build Jan 22, 2025",
    source: "GH",
    dl_tag: "GW_repo/tag/v1.3"
  },
  {
    _id: ObjectId("661d8a7540cb84cb4ed9924e"),
    firmware_id: "HM_Prod_1.0.1_2.0.3",
    firmware_desc: "Prod - Haptic Module - 585: v1.0.1, NRF: v2.0.3 - build Sep 05, 2024",
    source: "GLG",
    dl_tag: "HM_repo/tag/v1.0.1"
  },
  {
    _id: ObjectId("661d8a7540cb84cb4ed9924f"),
    firmware_id: "RS_Prod_1.1.1_2.3.2",
    firmware_desc: "Prod - Receptor Sole - 585: v1.1.1, NRF: v2.3.2 - build Jul 18, 2024",
    source: "GLG",
    dl_tag: "RS_repo/tag/v1.1.1"
  },
  {
    _id: ObjectId("661d8a7540cb84cb4ed99250"),
    firmware_id: "GW_Beta_1.2.0_2.4.5_89.40.2",
    firmware_desc: "Beta - Gateway - 585: v1.2.0, NRF: v2.4.5, HL7800: v89.40.2 - build Feb 14, 2025",
    source: "GH",
    dl_tag: "GW_repo/tag/v1.2-beta"
  },
  {
    _id: ObjectId("661d8a7540cb84cb4ed99251"),
    firmware_id: "HM_Beta_2.2.0_2.2.1",
    firmware_desc: "Beta - Haptic Module - 585: v2.2.0, NRF: v2.2.1 - build Jan 30, 2025",
    source: "GH",
    dl_tag: "HM_repo/tag/v2.2-beta"
  },
  {
    _id: ObjectId("661d8a7540cb84cb4ed99252"),
    firmware_id: "RS_Beta_1.3.0_2.5.1",
    firmware_desc: "Beta - Receptor Sole - 585: v1.3.0, NRF: v2.5.1 - build Mar 10, 2025",
    source: "GLG",
    dl_tag: "RS_repo/tag/v1.3-beta"
  },
  {
    _id: ObjectId("661d8a7540cb84cb4ed99253"),
    firmware_id: "GW_Prod_1.0.2_2.2.3_89.33.1",
    firmware_desc: "Prod - Gateway - 585: v1.0.2, NRF: v2.2.3, HL7800: v89.33.1 - build May 12, 2024",
    source: "GLG",
    dl_tag: "GW_repo/tag/v1.0.2"
  },
  {
    _id: ObjectId("661d8a7540cb84cb4ed99254"),
    firmware_id: "HM_DEV_2.3.0_2.3.0",
    firmware_desc: "Dev - Haptic Module - 585: v2.3.0, NRF: v2.3.0 - build Apr 25, 2025",
    source: "GH",
    dl_tag: "HM_repo/tag/v2.3"
  },
  {
    _id: ObjectId("661d8a7540cb84cb4ed99255"),
    firmware_id: "RS_DEV_1.4.0_2.6.0",
    firmware_desc: "Dev - Receptor Sole - 585: v1.4.0, NRF: v2.6.0 - build May 08, 2025",
    source: "GH",
    dl_tag: "RS_repo/tag/v1.4"
  },
  {
    _id: ObjectId("661d8a7540cb84cb4ed99256"),
    firmware_id: "GW_Alpha_1.4.0_2.6.1_90.25.0",
    firmware_desc: "Alpha - Gateway - 585: v1.4.0, NRF: v2.6.1, HL7800: v90.25.0 - build Jun 15, 2025",
    source: "GH",
    dl_tag: "GW_repo/tag/v1.4-alpha"
  },
  {
    _id: ObjectId("661d8a7540cb84cb4ed99257"),
    firmware_id: "HM_Prod_1.1.0_2.1.0",
    firmware_desc: "Prod - Haptic Module - 585: v1.1.0, NRF: v2.1.0 - build Dec 20, 2024",
    source: "GLG",
    dl_tag: "HM_repo/tag/v1.1"
  },
  {
    _id: ObjectId("661d8a7540cb84cb4ed99258"),
    firmware_id: "RS_Prod_1.2.1_2.4.2",
    firmware_desc: "Prod - Receptor Sole - 585: v1.2.1, NRF: v2.4.2 - build Nov 30, 2024",
    source: "GLG",
    dl_tag: "RS_repo/tag/v1.2.1"
  },
  {
    _id: ObjectId("661d8a7540cb84cb4ed99259"),
    firmware_id: "GW_DEV_1.5.0_2.7.0_91.01.0",
    firmware_desc: "Dev - Gateway - 585: v1.5.0, NRF: v2.7.0, HL7800: v91.01.0 - build Jul 03, 2025",
    source: "GH",
    dl_tag: "GW_repo/tag/v1.5"
  }
])