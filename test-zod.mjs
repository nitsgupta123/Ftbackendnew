import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Test 1: supplierFormSchema
try {
  const schema = z.object({
    supplierName: z.string().min(1, "Supplier name is required"),
    supplierPackageName: z.string().min(1, "Supplier package name is required"),
    supplierCountry: z.string().optional(),
    supplierCurrency: z.string().optional(),
    contactPerson: z.string().optional(),
    supplierEmail: z.string().email("Invalid email address").optional().or(z.literal("")),
    supplierPhoneNumber: z.string().optional(),
    validityFrom: z.string().optional(),
    validityTo: z.string().optional(),
    supplierBookingDeadline: z.string().optional(),
    supplierNotes: z.string().optional(),
  });
  console.log("Schema 1 created OK");
  const resolver = zodResolver(schema);
  console.log("Resolver 1 created OK, type:", typeof resolver);

  // Test parsing
  const defaultValues = {
    supplierName: "",
    supplierPackageName: "",
    supplierCountry: "",
    supplierCurrency: "",
    contactPerson: "",
    supplierEmail: "",
    supplierPhoneNumber: "",
    validityFrom: "",
    validityTo: "",
    supplierBookingDeadline: "",
    supplierNotes: "",
  };
  resolver(defaultValues, undefined, { fields: {} }).then(r => {
    console.log("Resolver 1 result:", JSON.stringify(r));
  }).catch(e => {
    console.log("Resolver 1 error:", e.message);
  });
} catch(e) {
  console.log("Schema 1 ERROR:", e.message);
}

// Test 2: packageBasicsSchema
try {
  const schema = z.object({
    packageTitle: z.string().min(1, "Package title is required"),
    slug: z.string().min(1, "Slug is required"),
    shortIntro: z.string().optional(),
    packageMode: z.string().min(1, "Package mode is required"),
    tourType: z.string().min(1, "Tour type is required"),
    runs: z.string().min(1, "Runs is required"),
    countriesCovered: z.string().optional(),
    citiesOrRegions: z.string().optional(),
    startingPoint: z.string().optional(),
    endingPoint: z.string().optional(),
    days: z.string().optional(),
    nights: z.string().optional(),
    categories: z.array(z.string()).optional(),
    landingPages: z.array(z.string()).optional(),
    domesticFlightsIncluded: z.boolean(),
    trainIncluded: z.boolean(),
    transfersIncluded: z.boolean(),
    isSeasonalPackage: z.boolean(),
  });
  console.log("Schema 2 created OK");
  const resolver = zodResolver(schema);
  console.log("Resolver 2 created OK, type:", typeof resolver);

  // Test parsing with empty values
  const defaultValues = {
    packageTitle: "",
    slug: "",
    shortIntro: "",
    packageMode: "",
    tourType: "",
    runs: "",
    countriesCovered: "",
    citiesOrRegions: "",
    startingPoint: "",
    endingPoint: "",
    days: "",
    nights: "",
    categories: [],
    landingPages: [],
    domesticFlightsIncluded: false,
    trainIncluded: false,
    transfersIncluded: false,
    isSeasonalPackage: false,
  };
  resolver(defaultValues, undefined, { fields: {} }).then(r => {
    console.log("Resolver 2 result:", JSON.stringify(r));
  }).catch(e => {
    console.log("Resolver 2 error:", e.message);
    console.log(e.stack);
  });
} catch(e) {
  console.log("Schema 2 ERROR:", e.message);
  console.log(e.stack);
}