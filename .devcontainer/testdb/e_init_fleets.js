db.createCollection('SystemFleets', { capped: false });
db.SystemFleets.insertMany([
  {
    _id: ObjectId("661d8a7540cb84cb4ed99257"),
    fleet_name: `ProdFleet1`,
    fleet_description: "Production OTA Group 1",
    device_groups: [
        {
          _id: ObjectId(),
          group: ObjectId('661d8a7540cb84cb4ed99253'),
          firmware: ObjectId('661d8a7540cb84cb4ed99244')
        },
        {
          _id: ObjectId(),
          group: ObjectId('661d8a7540cb84cb4ed99254'),
          firmware: ObjectId('661d8a7540cb84cb4ed99248')
        },
        {
          _id: ObjectId(),
          group: ObjectId('661d8a7540cb84cb4ed99255'),
          firmware: ObjectId('661d8a7540cb84cb4ed99246')
        },
        {
          _id: ObjectId(),
          group: ObjectId('661d8a7540cb84cb4ed99256'),
          firmware: ObjectId('661d8a7540cb84cb4ed99247')
        },
        {
          _id: ObjectId(),
          group: ObjectId('661d8a7540cb84cb4ed99300'),
          firmware: ObjectId('661d8a7540cb84cb4ed99249')
        }
    ]
  },
  {
    _id: ObjectId("661d8a7540cb84cb4ed99999"),
    fleet_name: `DevFleet1`,
    fleet_description: "Development OTA Group 1",
    device_groups: [
        {
          _id: ObjectId(),
          group: ObjectId('661d8a7540cb84cb4ed99253'),
          firmware: ObjectId('661d8a7540cb84cb4ed99244')
        },
        {
          _id: ObjectId(),
          group: ObjectId('661d8a7540cb84cb4ed99254'),
          firmware: ObjectId('661d8a7540cb84cb4ed99248')
        },
        {
          _id: ObjectId(),
          group: ObjectId('661d8a7540cb84cb4ed99255'),
          firmware: ObjectId('661d8a7540cb84cb4ed99246')
        },
        {
          _id: ObjectId(),
          group: ObjectId('661d8a7540cb84cb4ed99256'),
          firmware: ObjectId('661d8a7540cb84cb4ed99247')
        },
        {
          _id: ObjectId(),
          group: ObjectId('661d8a7540cb84cb4ed99300'),
          firmware: ObjectId('661d8a7540cb84cb4ed99249')
        }
    ]
  },
  {
    _id: ObjectId("661d8a7540cb84cb4ed99258"),
    fleet_name: `ClinicalTrialFleet1`,
    fleet_description: "Clinical Trial Phase I",
    device_groups: [
        {
          _id: ObjectId(),
          group: ObjectId('661d8a7540cb84cb4ed99301'),
          firmware: ObjectId('661d8a7540cb84cb4ed9924e')
        },
        {
          _id: ObjectId(),
          group: ObjectId('661d8a7540cb84cb4ed99302'),
          firmware: ObjectId('661d8a7540cb84cb4ed99246')
        },
        {
          _id: ObjectId(),
          group: ObjectId('661d8a7540cb84cb4ed99303'),
          firmware: ObjectId('661d8a7540cb84cb4ed9924a')
        }
    ]
  },
  {
    _id: ObjectId("661d8a7540cb84cb4ed99259"),
    fleet_name: `ManufacturingQA`,
    fleet_description: "Manufacturing Quality Assurance",
    device_groups: [
        {
          _id: ObjectId(),
          group: ObjectId('661d8a7540cb84cb4ed99304'),
          firmware: ObjectId('661d8a7540cb84cb4ed9924c')
        },
        {
          _id: ObjectId(),
          group: ObjectId('661d8a7540cb84cb4ed99305'),
          firmware: ObjectId('661d8a7540cb84cb4ed9924b')
        },
        {
          _id: ObjectId(),
          group: ObjectId('661d8a7540cb84cb4ed99306'),
          firmware: ObjectId('661d8a7540cb84cb4ed99246')
        },
        {
          _id: ObjectId(),
          group: ObjectId('661d8a7540cb84cb4ed99307'),
          firmware: ObjectId('661d8a7540cb84cb4ed9924d')
        }
    ]
  },
  {
    _id: ObjectId("661d8a7540cb84cb4ed9925a"),
    fleet_name: `BetaTestFleet`,
    fleet_description: "Beta Testing for Early Adopters",
    device_groups: [
        {
          _id: ObjectId(),
          group: ObjectId('661d8a7540cb84cb4ed99308'),
          firmware: ObjectId('661d8a7540cb84cb4ed99252')
        },
        {
          _id: ObjectId(),
          group: ObjectId('661d8a7540cb84cb4ed99309'),
          firmware: ObjectId('661d8a7540cb84cb4ed99251')
        }
    ]
  },
  {
    _id: ObjectId("661d8a7540cb84cb4ed9925b"),
    fleet_name: `StagingEnvironment`,
    fleet_description: "Staging Environment Fleet",
    device_groups: [
        {
          _id: ObjectId(),
          group: ObjectId('661d8a7540cb84cb4ed9930a'),
          firmware: ObjectId('661d8a7540cb84cb4ed99253')
        },
        {
          _id: ObjectId(),
          group: ObjectId('661d8a7540cb84cb4ed9930b'),
          firmware: ObjectId('661d8a7540cb84cb4ed9924f')
        },
        {
          _id: ObjectId(),
          group: ObjectId('661d8a7540cb84cb4ed9930c'),
          firmware: ObjectId('661d8a7540cb84cb4ed99254')
        },
        {
          _id: ObjectId(),
          group: ObjectId('661d8a7540cb84cb4ed9930d'),
          firmware: ObjectId('661d8a7540cb84cb4ed99246')
        },
        {
          _id: ObjectId(),
          group: ObjectId('661d8a7540cb84cb4ed9930e'),
          firmware: ObjectId('661d8a7540cb84cb4ed99256')
        }
    ]
  },
  {
    _id: ObjectId("661d8a7540cb84cb4ed9925c"),
    fleet_name: `ClinicalTrialFleet2`,
    fleet_description: "Clinical Trial Phase II",
    device_groups: [
        {
          _id: ObjectId(),
          group: ObjectId('661d8a7540cb84cb4ed9930f'),
          firmware: ObjectId('661d8a7540cb84cb4ed99255')
        }
    ]
  },
  {
    _id: ObjectId("661d8a7540cb84cb4ed9925d"),
    fleet_name: `DevFleet2`,
    fleet_description: "Development Hardware Team",
    device_groups: [
        {
          _id: ObjectId(),
          group: ObjectId('661d8a7540cb84cb4ed99253'),
          firmware: ObjectId('661d8a7540cb84cb4ed99257')
        },
        {
          _id: ObjectId(),
          group: ObjectId('661d8a7540cb84cb4ed99301'),
          firmware: ObjectId('661d8a7540cb84cb4ed9924e')
        },
        {
          _id: ObjectId(),
          group: ObjectId('661d8a7540cb84cb4ed99302'),
          firmware: ObjectId('661d8a7540cb84cb4ed99246')
        },
        {
          _id: ObjectId(),
          group: ObjectId('661d8a7540cb84cb4ed99303'),
          firmware: ObjectId('661d8a7540cb84cb4ed9924a')
        },
        {
          _id: ObjectId(),
          group: ObjectId('661d8a7540cb84cb4ed99304'),
          firmware: ObjectId('661d8a7540cb84cb4ed9924c')
        },
        {
          _id: ObjectId(),
          group: ObjectId('661d8a7540cb84cb4ed99305'),
          firmware: ObjectId('661d8a7540cb84cb4ed9924b')
        }
    ]
  },
  {
    _id: ObjectId("661d8a7540cb84cb4ed9925e"),
    fleet_name: `FieldTestFleet`,
    fleet_description: "Field Testing Real-World Validation",
    device_groups: []
  },
  {
    _id: ObjectId("661d8a7540cb84cb4ed9925f"),
    fleet_name: `AlphaTestFleet`,
    fleet_description: "Alpha Testing Bleeding Edge",
    device_groups: [
        {
          _id: ObjectId(),
          group: ObjectId('661d8a7540cb84cb4ed99256'),
          firmware: ObjectId('661d8a7540cb84cb4ed99256')
        }
    ]
  },
  {
    _id: ObjectId("661d8a7540cb84cb4ed99260"),
    fleet_name: `ProductionStable`,
    fleet_description: "Production Stable General Release",
    device_groups: [
        {
          _id: ObjectId(),
          group: ObjectId('661d8a7540cb84cb4ed99254'),
          firmware: ObjectId('661d8a7540cb84cb4ed99244')
        },
        {
          _id: ObjectId(),
          group: ObjectId('661d8a7540cb84cb4ed99255'),
          firmware: ObjectId('661d8a7540cb84cb4ed99246')
        },
        {
          _id: ObjectId(),
          group: ObjectId('661d8a7540cb84cb4ed99256'),
          firmware: ObjectId('661d8a7540cb84cb4ed99247')
        },
        {
          _id: ObjectId(),
          group: ObjectId('661d8a7540cb84cb4ed99300'),
          firmware: ObjectId('661d8a7540cb84cb4ed99249')
        },
        {
          _id: ObjectId(),
          group: ObjectId('661d8a7540cb84cb4ed99306'),
          firmware: ObjectId('661d8a7540cb84cb4ed99246')
        }
    ]
  },
  {
    _id: ObjectId("661d8a7540cb84cb4ed99261"),
    fleet_name: `ClinicalTrialFleet3`,
    fleet_description: "Clinical Trial Phase III",
    device_groups: [
        {
          _id: ObjectId(),
          group: ObjectId('661d8a7540cb84cb4ed99307'),
          firmware: ObjectId('661d8a7540cb84cb4ed99253')
        },
        {
          _id: ObjectId(),
          group: ObjectId('661d8a7540cb84cb4ed99308'),
          firmware: ObjectId('661d8a7540cb84cb4ed9924f')
        },
        {
          _id: ObjectId(),
          group: ObjectId('661d8a7540cb84cb4ed99309'),
          firmware: ObjectId('661d8a7540cb84cb4ed99257')
        }
    ]
  },
  {
    _id: ObjectId("661d8a7540cb84cb4ed99262"),
    fleet_name: `DevFleet3`,
    fleet_description: "Development Firmware Team",
    device_groups: [
        {
          _id: ObjectId(),
          group: ObjectId('661d8a7540cb84cb4ed9930a'),
          firmware: ObjectId('661d8a7540cb84cb4ed99253')
        },
        {
          _id: ObjectId(),
          group: ObjectId('661d8a7540cb84cb4ed9930b'),
          firmware: ObjectId('661d8a7540cb84cb4ed99258')
        }
    ]
  },
  {
    _id: ObjectId("661d8a7540cb84cb4ed99263"),
    fleet_name: `PreProductionFleet`,
    fleet_description: "Pre-Production Final Validation",
    device_groups: [
        {
          _id: ObjectId(),
          group: ObjectId('661d8a7540cb84cb4ed9930c'),
          firmware: ObjectId('661d8a7540cb84cb4ed99254')
        },
        {
          _id: ObjectId(),
          group: ObjectId('661d8a7540cb84cb4ed9930d'),
          firmware: ObjectId('661d8a7540cb84cb4ed99246')
        },
        {
          _id: ObjectId(),
          group: ObjectId('661d8a7540cb84cb4ed9930e'),
          firmware: ObjectId('661d8a7540cb84cb4ed99256')
        },
        {
          _id: ObjectId(),
          group: ObjectId('661d8a7540cb84cb4ed9930f'),
          firmware: ObjectId('661d8a7540cb84cb4ed99255')
        },
        {
          _id: ObjectId(),
          group: ObjectId('661d8a7540cb84cb4ed99253'),
          firmware: ObjectId('661d8a7540cb84cb4ed99257')
        },
        {
          _id: ObjectId(),
          group: ObjectId('661d8a7540cb84cb4ed99301'),
          firmware: ObjectId('661d8a7540cb84cb4ed9924e')
        },
        {
          _id: ObjectId(),
          group: ObjectId('661d8a7540cb84cb4ed99302'),
          firmware: ObjectId('661d8a7540cb84cb4ed99246')
        }
    ]
  },
  {
    _id: ObjectId("661d8a7540cb84cb4ed99264"),
    fleet_name: `RegulatoryFleet`,
    fleet_description: "Regulatory Testing Compliance",
    device_groups: [
        {
          _id: ObjectId(),
          group: ObjectId('661d8a7540cb84cb4ed99304'),
          firmware: ObjectId('661d8a7540cb84cb4ed9924c')
        },
        {
          _id: ObjectId(),
          group: ObjectId('661d8a7540cb84cb4ed99305'),
          firmware: ObjectId('661d8a7540cb84cb4ed9924b')
        }
    ]
  },
  {
    _id: ObjectId("661d8a7540cb84cb4ed99265"),
    fleet_name: `ManufacturingFloor`,
    fleet_description: "Manufacturing Floor Production Line",
    device_groups: [
        {
          _id: ObjectId(),
          group: ObjectId('661d8a7540cb84cb4ed99306'),
          firmware: ObjectId('661d8a7540cb84cb4ed99246')
        },
        {
          _id: ObjectId(),
          group: ObjectId('661d8a7540cb84cb4ed99307'),
          firmware: ObjectId('661d8a7540cb84cb4ed9924d')
        },
        {
          _id: ObjectId(),
          group: ObjectId('661d8a7540cb84cb4ed99308'),
          firmware: ObjectId('661d8a7540cb84cb4ed9924f')
        }
    ]
  },
  {
    _id: ObjectId("661d8a7540cb84cb4ed99266"),
    fleet_name: `CustomerSupportFleet`,
    fleet_description: "Customer Support Issue Reproduction",
    device_groups: [
        {
          _id: ObjectId(),
          group: ObjectId('661d8a7540cb84cb4ed99309'),
          firmware: ObjectId('661d8a7540cb84cb4ed99257')
        }
    ]
  },
  {
    _id: ObjectId("661d8a7540cb84cb4ed99267"),
    fleet_name: `InternalTestFleet`,
    fleet_description: "Internal Testing Employee Validation",
    device_groups: [
        {
          _id: ObjectId(),
          group: ObjectId('661d8a7540cb84cb4ed9930a'),
          firmware: ObjectId('661d8a7540cb84cb4ed99253')
        },
        {
          _id: ObjectId(),
          group: ObjectId('661d8a7540cb84cb4ed9930b'),
          firmware: ObjectId('661d8a7540cb84cb4ed99258')
        },
        {
          _id: ObjectId(),
          group: ObjectId('661d8a7540cb84cb4ed9930c'),
          firmware: ObjectId('661d8a7540cb84cb4ed99254')
        },
        {
          _id: ObjectId(),
          group: ObjectId('661d8a7540cb84cb4ed9930d'),
          firmware: ObjectId('661d8a7540cb84cb4ed99246')
        }
    ]
  },
  {
    _id: ObjectId("661d8a7540cb84cb4ed99268"),
    fleet_name: `EmergencyPatchFleet`,
    fleet_description: "Emergency Patch Critical Updates",
    device_groups: []
  },
  {
    _id: ObjectId("661d8a7540cb84cb4ed99269"),
    fleet_name: `LongTermTestFleet`,
    fleet_description: "Long Term Testing Durability",
    device_groups: [
        {
          _id: ObjectId(),
          group: ObjectId('661d8a7540cb84cb4ed9930e'),
          firmware: ObjectId('661d8a7540cb84cb4ed99256')
        },
        {
          _id: ObjectId(),
          group: ObjectId('661d8a7540cb84cb4ed9930f'),
          firmware: ObjectId('661d8a7540cb84cb4ed99255')
        },
        {
          _id: ObjectId(),
          group: ObjectId('661d8a7540cb84cb4ed99254'),
          firmware: ObjectId('661d8a7540cb84cb4ed99244')
        },
        {
          _id: ObjectId(),
          group: ObjectId('661d8a7540cb84cb4ed99300'),
          firmware: ObjectId('661d8a7540cb84cb4ed99249')
        },
        {
          _id: ObjectId(),
          group: ObjectId('661d8a7540cb84cb4ed99301'),
          firmware: ObjectId('661d8a7540cb84cb4ed9924e')
        }
    ]
  }
])