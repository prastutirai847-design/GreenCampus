import { getRecentMonths } from '../utils/dates.js';

export const DEFAULT_PROFILE = {
  name: 'Northfield Institute of Technology',
  shortName: 'Northfield',
  city: 'Pune, Maharashtra',
  type: 'Engineering',
  students: 3200,
  staff: 410,
  campusBuildings: 6,
  campusAreaAcres: 42,
  academicYear: '2025–26',
  sustainabilityLead: 'Campus Sustainability Office',
  contactEmail: 'sustainability@northfield.example',
};

export const DEMO_DEPARTMENTS = [
  {
    id: 'dept_academic',
    name: 'Academic Affairs',
    code: 'ACA',
    head: 'Dean of Academics',
    description: 'Teaching spaces, faculty offices and academic support services.',
  },
  {
    id: 'dept_science',
    name: 'Science & Engineering',
    code: 'SCI',
    head: 'Head of Science & Engineering',
    description: 'Laboratories, workshops and research equipment.',
  },
  {
    id: 'dept_library',
    name: 'Library Services',
    code: 'LIB',
    head: 'Chief Librarian',
    description: 'Reading rooms, archives and digital learning resources.',
  },
  {
    id: 'dept_housing',
    name: 'Student Housing',
    code: 'HOS',
    head: 'Hostel Warden',
    description: 'Residential blocks, common rooms and hostel services.',
  },
  {
    id: 'dept_sports',
    name: 'Sports & Recreation',
    code: 'SPO',
    head: 'Director of Sports',
    description: 'Indoor courts, fitness facilities and the swimming pool.',
  },
  {
    id: 'dept_admin',
    name: 'Administration',
    code: 'ADM',
    head: 'Registrar',
    description: 'Administrative offices, admissions and finance.',
  },
  {
    id: 'dept_facilities',
    name: 'Facilities',
    code: 'FAC',
    head: 'Facilities Manager',
    description: 'Campus maintenance, generators and shared infrastructure.',
  },
  {
    id: 'dept_transport',
    name: 'Transport',
    code: 'TRA',
    head: 'Transport Officer',
    description: 'College-owned vehicles and campus fleet operations.',
  },
  {
    id: 'dept_canteen',
    name: 'Canteen',
    code: 'CAN',
    head: 'Canteen Manager',
    description: 'Dining halls, kitchens and food service operations.',
  },
];

export const DEMO_BUILDINGS = [
  {
    id: 'b_academic',
    name: 'Academic Block A',
    type: 'Academic block',
    areaSqm: 4200,
    floors: 4,
    occupants: 1400,
    departmentId: 'dept_academic',
    description: 'Lecture halls, faculty offices and two computer labs.',
  },
  {
    id: 'b_science',
    name: 'Science & Engineering Block',
    type: 'Laboratory',
    areaSqm: 3800,
    floors: 3,
    occupants: 950,
    departmentId: 'dept_science',
    description: 'Laboratories with fume hoods and high equipment loads.',
  },
  {
    id: 'b_library',
    name: 'Central Library',
    type: 'Library',
    areaSqm: 2600,
    floors: 3,
    occupants: 600,
    departmentId: 'dept_library',
    description: 'Reading rooms, archives and a 24-hour study floor.',
  },
  {
    id: 'b_residence',
    name: 'Student Residences',
    type: 'Residence',
    areaSqm: 5100,
    floors: 5,
    occupants: 800,
    departmentId: 'dept_housing',
    description: 'Four hostel blocks sharing a water and electricity meter.',
  },
  {
    id: 'b_sports',
    name: 'Sports Complex',
    type: 'Sports & recreation',
    areaSqm: 1800,
    floors: 2,
    occupants: 300,
    departmentId: 'dept_sports',
    description: 'Indoor courts, gym and a swimming pool.',
  },
  {
    id: 'b_admin',
    name: 'Administration Building',
    type: 'Administration',
    areaSqm: 1400,
    floors: 3,
    occupants: 160,
    departmentId: 'dept_admin',
    description: 'Administrative offices, admissions and finance.',
  },
];

const ELECTRICITY_BASE = {
  b_academic: 32000,
  b_science: 46000,
  b_library: 16500,
  b_residence: 39000,
  b_sports: 10200,
  b_admin: 7400,
};

const WATER_BASE = {
  b_academic: 760,
  b_science: 1020,
  b_library: 230,
  b_residence: 2050,
  b_sports: 560,
  b_admin: 170,
};

const ELECTRICITY_SEASON = [0.94, 0.9, 1.0, 1.07, 1.12, 1.08, 1.0, 1.02, 1.07, 1.04, 0.97, 0.93];
const WATER_SEASON = [0.95, 0.92, 1.0, 1.06, 1.1, 1.08, 1.02, 1.0, 1.0, 1.02, 0.98, 0.94];
const GENERATOR_SEASON = [1.0, 0.9, 0.85, 0.9, 1.0, 1.15, 1.3, 1.25, 1.05, 0.95, 0.9, 1.0];

function monthIndex(period) {
  return Number(period.slice(5, 7)) - 1;
}

function createdAtFor(period, day = 6) {
  return new Date(`${period}-${String(day).padStart(2, '0')}T09:30:00`).toISOString();
}

export function buildDemoActivities() {
  const activities = [];
  const months = getRecentMonths(12);

  months.forEach((period, index) => {
    const month = monthIndex(period);

    DEMO_BUILDINGS.forEach((building, buildingIndex) => {
      const electricityBase = ELECTRICITY_BASE[building.id];
      const waterBase = WATER_BASE[building.id];
      const wobble = 1 + (((index + buildingIndex * 2) % 5) - 2) * 0.015;

      activities.push({
        id: `demo_elec_${building.id}_${period}`,
        category: 'electricity',
        period,
        buildingId: building.id,
        kwh: Math.round((electricityBase * ELECTRICITY_SEASON[month] * wobble) / 10) * 10,
        notes: '',
        createdAt: createdAtFor(period),
      });

      activities.push({
        id: `demo_water_${building.id}_${period}`,
        category: 'water',
        period,
        buildingId: building.id,
        cubicMeters: Math.round(waterBase * WATER_SEASON[month] * (2 - wobble)),
        notes: '',
        createdAt: createdAtFor(period, 7),
      });
    });

    const dieselQuantity = Math.round(1450 * GENERATOR_SEASON[month] + (index % 3) * 55);
    activities.push({
      id: `demo_fuel_diesel_generator_${period}`,
      category: 'fuel',
      period,
      date: `${period}-08`,
      fuelType: 'diesel',
      purpose: 'Backup generator',
      quantity: dieselQuantity,
      buildingId: null,
      department: 'Facilities',
      departmentId: 'dept_facilities',
      notes:
        index === 6
          ? 'Extended monsoon outage — higher generator runtime.'
          : '',
      createdAt: createdAtFor(period, 8),
    });

    activities.push({
      id: `demo_fuel_petrol_vehicles_${period}`,
      category: 'fuel',
      period,
      date: `${period}-09`,
      fuelType: 'petrol',
      purpose: 'College vehicle',
      quantity: 720 + (index % 4) * 35,
      buildingId: null,
      department: 'Transport',
      departmentId: 'dept_transport',
      notes: '',
      createdAt: createdAtFor(period, 9),
    });

    activities.push({
      id: `demo_fuel_lpg_kitchen_${period}`,
      category: 'fuel',
      period,
      date: `${period}-10`,
      fuelType: 'lpg',
      purpose: 'Kitchen / canteen',
      quantity: 360 + (index % 3) * 18,
      buildingId: null,
      department: 'Canteen',
      departmentId: 'dept_canteen',
      notes: '',
      createdAt: createdAtFor(period, 10),
    });

    activities.push({
      id: `demo_waste_mixed_${period}`,
      category: 'waste',
      period,
      date: `${period}-11`,
      wasteCategory: 'mixed',
      disposal: 'landfill',
      weightKg: 3150 + index * 70,
      buildingId: null,
      notes: '',
      createdAt: createdAtFor(period, 11),
    });

    activities.push({
      id: `demo_waste_organic_${period}`,
      category: 'waste',
      period,
      date: `${period}-12`,
      wasteCategory: 'organic',
      disposal: 'composting',
      weightKg: 820 + index * 15,
      buildingId: null,
      notes: '',
      createdAt: createdAtFor(period, 12),
    });

    activities.push({
      id: `demo_waste_paper_${period}`,
      category: 'waste',
      period,
      date: `${period}-13`,
      wasteCategory: 'paper',
      disposal: 'recycling',
      weightKg: 540 + (index % 3) * 40,
      buildingId: null,
      notes: '',
      createdAt: createdAtFor(period, 13),
    });

    activities.push({
      id: `demo_waste_plastic_${period}`,
      category: 'waste',
      period,
      date: `${period}-14`,
      wasteCategory: 'plastic',
      disposal: 'recycling',
      weightKg: 360 + (index % 2) * 30,
      buildingId: null,
      notes: '',
      createdAt: createdAtFor(period, 14),
    });

    const commutingVariation = 1 + ((index % 4) - 1.5) * 0.01;
    const modes = [
      { mode: 'car', commuters: 420, distanceKm: 9, tripsPerMonth: 20 },
      { mode: 'two-wheeler', commuters: 640, distanceKm: 6, tripsPerMonth: 22 },
      { mode: 'bus', commuters: 880, distanceKm: 12, tripsPerMonth: 20 },
      { mode: 'rail', commuters: 310, distanceKm: 14, tripsPerMonth: 20 },
      { mode: 'walk-cycle', commuters: 430, distanceKm: 3, tripsPerMonth: 20 },
    ];

    modes.forEach((entry, modeIndex) => {
      activities.push({
        id: `demo_commute_${entry.mode}_${period}`,
        category: 'commuting',
        period,
        mode: entry.mode,
        distanceKm: entry.distanceKm,
        tripsPerMonth: entry.tripsPerMonth,
        commuters: Math.round(entry.commuters * commutingVariation),
        notes: '',
        createdAt: createdAtFor(period, 15 + modeIndex),
      });
    });
  });

  return activities;
}

/**
 * Illustrative bill metadata. No PDF contents exist and nothing is parsed —
 * these records exist so the attachment list and filters can be demonstrated.
 */
export function buildDemoBills(activities = buildDemoActivities()) {
  const months = getRecentMonths(12);
  const latest = months[months.length - 1];
  const prior = months[months.length - 2];
  const activityById = new Map(activities.map((activity) => [activity.id, activity]));

  const make = (id, activityId, buildingId, title, provider, amount, billNumber, day) => {
    const activity = activityById.get(activityId);
    const period = activity?.period ?? latest;
    const uploadedAt = createdAtFor(period, day);
    return {
      id: `demo_bill_${id}_${period}`,
      category: activity?.category ?? 'electricity',
      period,
      activityId: activity?.id ?? null,
      buildingId,
      title,
      fileName: `${id.replace(/_/g, '-')}-${period}.pdf`,
      mimeType: 'application/pdf',
      sizeBytes: 190000 + (day % 5) * 28000,
      provider,
      billNumber,
      amount: Math.round(Number(amount) || 0),
      notes: 'Sample invoice metadata for the prototype. No PDF file is stored or parsed.',
      dataUrl: null,
      hasPreview: false,
      previewSkipped: false,
      sample: true,
      uploadedAt,
      updatedAt: uploadedAt,
    };
  };

  const scienceElectricity = activityById.get(`demo_elec_b_science_${latest}`);
  const academicElectricity = activityById.get(`demo_elec_b_academic_${prior}`);
  const residenceWater = activityById.get(`demo_water_b_residence_${latest}`);
  const generatorDiesel = activityById.get(`demo_fuel_diesel_generator_${latest}`);

  return [
    make(
      'science-block-electricity',
      scienceElectricity?.id,
      'b_science',
      'Science block electricity bill',
      'State electricity distribution (sample)',
      (Number(scienceElectricity?.kwh) || 0) * 8.4,
      `EB-${latest.replace('-', '')}-0412`,
      20,
    ),
    make(
      'academic-block-electricity',
      academicElectricity?.id,
      'b_academic',
      'Academic block electricity bill',
      'State electricity distribution (sample)',
      (Number(academicElectricity?.kwh) || 0) * 8.4,
      `EB-${prior.replace('-', '')}-0388`,
      19,
    ),
    make(
      'residence-water',
      residenceWater?.id,
      'b_residence',
      'Residence water bill',
      'Municipal water supply (sample)',
      (Number(residenceWater?.cubicMeters) || 0) * 28,
      `WB-${latest.replace('-', '')}-0771`,
      18,
    ),
    make(
      'generator-diesel',
      generatorDiesel?.id,
      null,
      'Generator diesel invoice',
      'Campus fuel vendor (sample)',
      (Number(generatorDiesel?.quantity) || 0) * 94,
      `FU-${latest.replace('-', '')}-0165`,
      21,
    ),
  ];
}

export function buildDemoDataset() {
  const activities = buildDemoActivities();
  return {
    buildings: DEMO_BUILDINGS.map((building) => ({ ...building })),
    departments: DEMO_DEPARTMENTS.map((department) => ({ ...department })),
    activities,
    bills: buildDemoBills(activities),
    profile: { ...DEFAULT_PROFILE },
  };
}
