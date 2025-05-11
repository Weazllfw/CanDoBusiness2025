'use client'

import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase'
import Image from 'next/image'
import Select, { type MultiValue } from 'react-select'
import CreatableSelect from 'react-select/creatable'
import InputMask from 'react-input-mask'

const canadianProvinces = {
  AB: 'Alberta',
  BC: 'British Columbia',
  MB: 'Manitoba',
  NB: 'New Brunswick',
  NL: 'Newfoundland and Labrador',
  NS: 'Nova Scotia',
  NT: 'Northwest Territories',
  NU: 'Nunavut',
  ON: 'Ontario',
  PE: 'Prince Edward Island',
  QC: 'Quebec',
  SK: 'Saskatchewan',
  YT: 'Yukon Territory'
} as const;

// Create a reverse mapping for canadianProvinces to easily get code from name
const provinceNameToCode: { [key: string]: string } = {};
for (const [code, name] of Object.entries(canadianProvinces)) {
  provinceNameToCode[name.replace(/ /g, '')] = code; // Handle spaces in names like "British Columbia" -> "BritishColumbia"
  provinceNameToCode[name] = code; // Also map with spaces if original data matches
}
// Add specific mappings for any discrepancies
provinceNameToCode['NewfoundlandAndLabrador'] = 'NL';
provinceNameToCode['NorthwestTerritories'] = 'NT';
provinceNameToCode['PrinceEdwardIsland'] = 'PE';


const canadianMetropolitanAreasRaw = {
  Alberta: [ "Calgary", "Edmonton", "Lethbridge", "Red Deer", "Grande Prairie", "Medicine Hat", "Wood Buffalo", "Lloydminster", "Okotoks" ],
  BritishColumbia: [ "Vancouver", "Victoria", "Kelowna", "Abbotsford–Mission", "Nanaimo", "Kamloops", "Chilliwack", "Prince George", "Vernon", "Courtenay", "Salmon Arm" ],
  Manitoba: [ "Winnipeg", "Brandon", "Steinbach", "Thompson", "Portage la Prairie", "Winkler" ],
  NewBrunswick: [ "Moncton", "Saint John", "Fredericton", "Bathurst", "Miramichi", "Edmundston", "Campbellton" ],
  NewfoundlandAndLabrador: [ "St. John's", "Corner Brook", "Gander", "Grand Falls-Windsor", "Happy Valley-Goose Bay" ],
  NovaScotia: [ "Halifax", "Sydney", "Truro", "New Glasgow", "Kentville", "Bridgewater" ],
  Ontario: [ "Toronto", "Ottawa–Gatineau", "Hamilton", "London", "Kitchener–Cambridge–Waterloo", "Windsor", "Oshawa", "St. Catharines–Niagara", "Barrie", "Kingston", "Sudbury", "Guelph", "Thunder Bay", "Peterborough", "Brantford", "Belleville", "North Bay", "Sault Ste. Marie", "Timmins", "Stratford", "Orillia", "Cornwall" ],
  PrinceEdwardIsland: [ "Charlottetown", "Summerside" ],
  Quebec: [ "Montreal", "Quebec City", "Gatineau", "Sherbrooke", "Trois-Rivières", "Saguenay", "Lévis", "Drummondville", "Granby", "Rimouski", "Shawinigan", "Saint-Hyacinthe", "Saint-Georges", "Joliette", "Val-d'Or", "Rouyn-Noranda" ],
  Saskatchewan: [ "Saskatoon", "Regina", "Prince Albert", "Moose Jaw", "Yorkton", "North Battleford" ],
  NorthwestTerritories: [ "Yellowknife", "Hay River", "Inuvik" ],
  Nunavut: [ "Iqaluit", "Rankin Inlet" ],
  Yukon: [ "Whitehorse", "Dawson City" ]
};

const metropolitanAreasByProvinceCode: { [key: string]: { value: string; label: string }[] } = {};
const OTHER_METRO_OPTION = { value: 'OTHER', label: 'Other (Specify)' };

for (const [provinceNameKey, cities] of Object.entries(canadianMetropolitanAreasRaw)) {
  const provinceCode = provinceNameToCode[provinceNameKey] || 
                       provinceNameToCode[provinceNameKey.replace(/([A-Z])/g, ' $1').trim()]; 
  
  if (provinceCode) {
    metropolitanAreasByProvinceCode[provinceCode] = [
      ...cities.map(city => ({ value: city, label: city })),
      OTHER_METRO_OPTION
    ];
  } else {
    console.warn(`Could not find province code for: ${provinceNameKey}`);
  }
}

// Helper function to generate keys from labels
const generateKey = (label: string) => label.toUpperCase().replace(/[^A-Z0-9_]/g, '_').replace(/_{2,}/g, '_');

// Industry Tags
const industryTagsRaw = [
  "Food & Beverage", "Agriculture", "Apparel & Textiles", "Automotive", "Aerospace & Aviation",
  "Construction", "Consumer Goods", "Cosmetics & Personal Care", "Electronics & Hardware",
  "Energy & Utilities", "Environmental Services", "Finance & Accounting", "Healthcare & Medical Devices",
  "Home Goods & Furniture", "Industrial Equipment", "Information Technology", "Legal & Compliance",
  "Logistics & Distribution", "Machining & Metalworking", "Media & Publishing", "Mining & Natural Resources",
  "Non-Profit / Community Services", "Packaging & Printing", "Paper & Pulp", "Pharmaceuticals",
  "Professional Services", "Renewable Energy", "Retail", "Software & SaaS", "Telecommunications",
  "Transportation", "Waste Management", "Wood & Forestry"
];

const PREDEFINED_INDUSTRIES: { [key: string]: string } = {};
industryTagsRaw.forEach(tag => PREDEFINED_INDUSTRIES[generateKey(tag)] = tag);
const industryOptions = Object.keys(PREDEFINED_INDUSTRIES).map(key => ({ value: key, label: PREDEFINED_INDUSTRIES[key] }));
const predefinedIndustryKeys = Object.keys(PREDEFINED_INDUSTRIES) as [string, ...string[]];

// Capability Tags (Services)
const capabilityTagsRaw = [
  "Assembly & Kitting", "3D Printing", "CAD Design", "Cold Storage", "Co-Packing", "Custom Fabrication",
  "Die Cutting", "Digital Printing", "Drop Shipping", "E-commerce Fulfillment", "Electrical Assembly",
  "Food Packaging", "Formulating / Mixing", "Injection Molding", "Label Printing", "Last-Mile Delivery",
  "Legal Advisory", "Logistics Coordination", "Machining (CNC, Laser, Plasma)", "Metal Bending / Forming",
  "Milling", "Packaging Design", "Palletizing", "Plastics Manufacturing", "Powder Coating",
  "Product Photography", "Product Sourcing", "Quality Control & Testing", "Regulatory Compliance Consulting",
  "Retail Distribution", "Screen Printing", "Sheet Metal Fabrication", "Shrink Wrapping",
  "Software Development", "Sustainability Consulting", "Tooling & Prototyping", "Warehousing",
  "Welding", "Wholesale Distribution", "Woodworking", "Workforce Training"
];
const PREDEFINED_SERVICES: { [key: string]: string } = {};
capabilityTagsRaw.forEach(tag => PREDEFINED_SERVICES[generateKey(tag)] = tag);
const serviceOptions = Object.keys(PREDEFINED_SERVICES).map(key => ({ value: key, label: PREDEFINED_SERVICES[key] }));
const predefinedServiceKeys = Object.keys(PREDEFINED_SERVICES) as [string, ...string[]];

const PREDEFINED_METRO_AREAS = {
  GTA: 'Greater Toronto Area',
  GVA: 'Metro Vancouver',
  CAL: 'Calgary Region',
  MON: 'Montreal Metropolitan Community',
  OTT: 'Ottawa-Gatineau',
  EDM: 'Edmonton Metropolitan Region',
  OTHER: 'Other (Specify)'
} as const;

const predefinedMetroAreaKeys = Object.keys(PREDEFINED_METRO_AREAS) as [keyof typeof PREDEFINED_METRO_AREAS, ...(keyof typeof PREDEFINED_METRO_AREAS)[]];

// Base schema definition for individual fields
const MAX_DESCRIPTION_LENGTH = 1000;
const MAX_COMPANY_NAME_LENGTH = 100;
const MAX_OTHER_METRO_LENGTH = 100;
const baseCompanySchemaObject = {
  name: z.string().min(2, 'Name must be at least 2 characters').max(MAX_COMPANY_NAME_LENGTH, `Company name must be ${MAX_COMPANY_NAME_LENGTH} characters or less`),
  description: z.string().min(1, 'Description is required').max(MAX_DESCRIPTION_LENGTH, `Description must be ${MAX_DESCRIPTION_LENGTH} characters or less`),
  website: z.string().url('Invalid website URL').optional().or(z.literal('')),
  location: z.string().optional(),
  industry: z.array(z.enum(predefinedIndustryKeys)).min(1, 'Please select at least one industry').max(3, 'Select up to 3 industries'),
  avatar_url: z.string().url().optional().nullable(),
  street_address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().refine(val => val !== '' && Object.keys(canadianProvinces).includes(val), {
    message: "Province/Territory is required and must be a valid selection.",
  }) as z.ZodType<keyof typeof canadianProvinces | ''>,
  postal_code: z.string()
    .regex(/^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/, 'Invalid Canadian Postal Code Format')
    .transform(val => {
      const cleaned = val.toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (cleaned.length === 6) {
        return `${cleaned.substring(0, 3)} ${cleaned.substring(3, 6)}`;
      }
      return val;
    })
    .optional().or(z.literal('')),
  major_metropolitan_area: z.string().min(1, 'Major metropolitan area is required'),
  other_metropolitan_area_specify: z.string().max(MAX_OTHER_METRO_LENGTH, `Must be ${MAX_OTHER_METRO_LENGTH} characters or less`).optional(),
  contact_person_name: z.string().min(1, 'Contact person name is required'),
  contact_person_email: z.string().email('Invalid email address').optional().or(z.literal('')),
  contact_person_phone: z.string()
    .regex(/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/, "Invalid phone number format")
    .optional().or(z.literal('')),
  services: z.array(z.string()).min(1, "Please select or add at least one service"),
  // Tier 1 Verification Fields
  self_attestation_completed: z.boolean().optional(), // Optional for now, might become z.literal(true) if submitting for verification
  business_number: z.string().optional(),
  public_presence_links: z.array(z.string()).optional(), // Array of strings, can be URLs or other identifiers
};

// Create the object schema and then apply superRefine
const companySchema = z.object(baseCompanySchemaObject).superRefine((data, ctx) => {
  if (!data.contact_person_email && !data.contact_person_phone) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "At least one contact method (Email or Phone) is required.",
      path: ['contact_person_email'], 
    });
  }
  if (data.major_metropolitan_area === 'OTHER' && !data.other_metropolitan_area_specify?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Please specify the metropolitan area.",
      path: ['other_metropolitan_area_specify'],
    });
  }
});

export type CompanyFormData = z.infer<typeof companySchema>;

// Helper to ensure a value is an array of strings, for robust defaultValues
const ensureStringArray = (value: any): string[] => {
  if (Array.isArray(value)) {
    return value.filter(item => typeof item === 'string');
  }
  if (typeof value === 'string' && value.trim() !== '') {
    return [value]; // If it was a single string, wrap it in an array
  }
  return []; // Default to empty array
};

interface CompanyFormProps {
  initialData?: Partial<CompanyFormData> & { owner_id?: string | null };
  onSubmit: (data: CompanyFormData, newLogoFile?: File | null) => Promise<void>
  isLoading?: boolean
  companyId?: string
  submissionError?: string | null
}

export default function CompanyForm({ initialData, onSubmit, isLoading, companyId, submissionError }: CompanyFormProps) {
  const supabase = createClientComponentClient<Database>();
  const [internalError, setInternalError] = useState<string>('');
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(initialData?.avatar_url || null);
  const [metroAreaOptions, setMetroAreaOptions] = useState<{ value: string; label: string }[]>([]);
  const [showOtherMetroInput, setShowOtherMetroInput] = useState(false);
  
  const form = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      website: initialData?.website || '',
      location: initialData?.location || '',
      avatar_url: initialData?.avatar_url || null,
      street_address: initialData?.street_address || '',
      city: initialData?.city || '',
      province: initialData?.province || '',
      postal_code: initialData?.postal_code || '',
      major_metropolitan_area: initialData?.major_metropolitan_area || '',
      other_metropolitan_area_specify: initialData?.other_metropolitan_area_specify || '',
      contact_person_name: initialData?.contact_person_name || '',
      contact_person_email: initialData?.contact_person_email || '',
      contact_person_phone: initialData?.contact_person_phone || '',
      industry: ensureStringArray(initialData?.industry),
      services: ensureStringArray(initialData?.services),
      // Tier 1 Verification Fields
      self_attestation_completed: initialData?.self_attestation_completed || false,
      business_number: initialData?.business_number || '',
      public_presence_links: ensureStringArray(initialData?.public_presence_links),
    },
  });

  const selectedProvince = form.watch('province');
  const selectedMetroArea = form.watch('major_metropolitan_area');
  const descriptionValue = form.watch('description');
  const nameValue = form.watch('name');
  const otherMetroSpecifyValue = form.watch('other_metropolitan_area_specify');

  useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name || '',
        description: initialData.description || '',
        website: initialData.website || '',
        location: initialData.location || '',
        avatar_url: initialData.avatar_url || null,
        street_address: initialData.street_address || '',
        city: initialData.city || '',
        province: initialData.province || '',
        postal_code: initialData.postal_code || '',
        major_metropolitan_area: initialData.major_metropolitan_area || '',
        other_metropolitan_area_specify: initialData.other_metropolitan_area_specify || '',
        contact_person_name: initialData.contact_person_name || '',
        contact_person_email: initialData.contact_person_email || '',
        contact_person_phone: initialData.contact_person_phone || '',
        industry: ensureStringArray(initialData.industry),
        services: ensureStringArray(initialData.services),
        // Tier 1 Verification Fields
        self_attestation_completed: initialData.self_attestation_completed || false,
        business_number: initialData.business_number || '',
        public_presence_links: ensureStringArray(initialData.public_presence_links),
      });
      if (initialData.avatar_url) {
        setLogoPreview(initialData.avatar_url);
      } else {
        setLogoPreview(null);
      }
    } else {
      form.reset({
        name: '',
        description: '',
        website: '',
        location: '',
        avatar_url: null,
        street_address: '',
        city: '',
        province: '',
        postal_code: '',
        major_metropolitan_area: '',
        other_metropolitan_area_specify: '',
        contact_person_name: '',
        contact_person_email: '',
        contact_person_phone: '',
        industry: ensureStringArray(undefined),
        services: ensureStringArray(undefined),
        // Tier 1 Verification Fields
        self_attestation_completed: false,
        business_number: '',
        public_presence_links: ensureStringArray(undefined),
      });
      setLogoPreview(null);
    }
  }, [initialData, form.reset]);

  useEffect(() => {
    if (selectedProvince) {
      const areas = metropolitanAreasByProvinceCode[selectedProvince] || [];
      setMetroAreaOptions(areas);
      const currentMetroAreaValue = form.getValues('major_metropolitan_area');
      if (currentMetroAreaValue && !areas.find(area => area.value === currentMetroAreaValue)) {
        form.setValue('major_metropolitan_area', '', { shouldValidate: true, shouldDirty: true });
        form.setValue('other_metropolitan_area_specify', '', { shouldValidate: false });
        setShowOtherMetroInput(false);
      }
    } else {
      setMetroAreaOptions([]);
      form.setValue('major_metropolitan_area', '', { shouldValidate: true, shouldDirty: true });
      form.setValue('other_metropolitan_area_specify', '', { shouldValidate: false });
      setShowOtherMetroInput(false);
    }
  }, [selectedProvince, form]);

  useEffect(() => {
    if (selectedMetroArea === 'OTHER') {
      setShowOtherMetroInput(true);
    } else {
      setShowOtherMetroInput(false);
    }
  }, [selectedMetroArea, form]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      form.setValue('avatar_url', null, { shouldValidate: true, shouldDirty: true });
    } else {
      setSelectedLogoFile(null);
      setLogoPreview(initialData?.avatar_url || null);
      form.setValue('avatar_url', initialData?.avatar_url || null, { shouldValidate: true, shouldDirty: true });
    }
  };

  const handleSubmit = async (data: CompanyFormData) => {
    try {
      setInternalError('');
      await onSubmit(data, selectedLogoFile);
    } catch (err: any) {
      setInternalError(err.message || 'Failed to process form submission.');
    }
  };

  // Custom styles for react-select to match Tailwind form inputs
  const selectStyles = {
    control: (provided: any, state: any) => ({
      ...provided,
      borderColor: state.isFocused ? 'rgb(var(--color-primary-500))' : '#D1D5DB', // border-gray-300
      boxShadow: state.isFocused ? '0 0 0 1px rgb(var(--color-primary-500))' : 'none',
      '&:hover': {
        borderColor: state.isFocused ? 'rgb(var(--color-primary-500))' : '#9CA3AF', // border-gray-400
      },
      borderRadius: '0.375rem', // rounded-md
      minHeight: '38px', 
    }),
    valueContainer: (provided: any) => ({
      ...provided,
      padding: '1px 8px', // Adjusted padding slightly for vertical centering within 38px height
    }),
    input: (provided: any) => ({
      ...provided,
      color: '#111827', // text-gray-900
      margin: '0px',
      paddingTop: '0px',
      paddingBottom: '0px',
      // Prevent default browser styling on focus for the inner input
      outline: 'none',
      backgroundColor: 'transparent',
      border: '0 none',
      boxShadow: 'none',
    }),
    placeholder: (provided: any) => ({
      ...provided,
      color: '#6B7280', // text-gray-500 (Tailwind default placeholder color)
    }),
    multiValue: (provided: any) => ({
      ...provided,
      backgroundColor: 'rgb(var(--color-primary-100))', 
    }),
    multiValueLabel: (provided: any) => ({
      ...provided,
      color: 'rgb(var(--color-primary-700))',
    }),
    multiValueRemove: (provided: any) => ({
      ...provided,
      color: 'rgb(var(--color-primary-700))',
      '&:hover': {
        backgroundColor: 'rgb(var(--color-primary-200))',
        color: 'rgb(var(--color-primary-800))',
      },
    }),
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8 divide-y divide-gray-200">
      {submissionError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Submission Error: </strong>
          <span className="block sm:inline">{submissionError}</span>
        </div>
      )}
      {internalError && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Form Error: </strong>
          <span className="block sm:inline">{internalError}</span>
        </div>
      )}
      
      <div className="pt-8 space-y-6 sm:pt-10 sm:space-y-5">
        <div>
          <h3 className="text-lg leading-6 font-medium text-gray-900">Company Information</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">Basic details about the company.</p>
        </div>
        <div className="space-y-6 sm:space-y-5">
          <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start sm:border-t sm:border-gray-200 sm:pt-5">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 sm:mt-px sm:pt-2"> Company Name * </label>
            <div className="mt-1 sm:mt-0 sm:col-span-2">
              <input type="text" id="name" {...form.register('name')} className="max-w-lg block w-full shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm border-gray-300 rounded-md" />
              <p className="mt-1 text-xs text-gray-500 text-right">
                {nameValue?.length || 0} / {MAX_COMPANY_NAME_LENGTH}
              </p>
              {form.formState.errors.name && <p className="mt-1 text-sm text-red-500">{form.formState.errors.name.message}</p>}
            </div>
          </div>

          <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start sm:border-t sm:border-gray-200 sm:pt-5">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 sm:mt-px sm:pt-2"> Description * </label>
            <div className="mt-1 sm:mt-0 sm:col-span-2">
              <textarea id="description" {...form.register('description')} rows={3} className="max-w-lg shadow-sm block w-full focus:ring-primary-500 focus:border-primary-500 sm:text-sm border-gray-300 rounded-md" />
              <p className="mt-1 text-xs text-gray-500 text-right">
                {descriptionValue?.length || 0} / {MAX_DESCRIPTION_LENGTH}
              </p>
              {form.formState.errors.description && <p className="mt-1 text-sm text-red-500">{form.formState.errors.description.message}</p>}
            </div>
          </div>

          <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start sm:border-t sm:border-gray-200 sm:pt-5">
            <label htmlFor="website" className="block text-sm font-medium text-gray-700 sm:mt-px sm:pt-2"> Website </label>
            <div className="mt-1 sm:mt-0 sm:col-span-2">
              <input 
                type="url" 
                id="website" 
                {...form.register('website')} 
                className="max-w-lg block w-full shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm border-gray-300 rounded-md" 
                onBlur={(e) => {
                  let value = e.target.value;
                  if (value && !value.startsWith('http://') && !value.startsWith('https://')) {
                    value = `https://${value}`;
                  }
                  form.setValue('website', value, { shouldValidate: true, shouldDirty: true });
                }}
              />
              {form.formState.errors.website && <p className="mt-1 text-sm text-red-500">{form.formState.errors.website.message}</p>}
            </div>
          </div>

          <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start sm:border-t sm:border-gray-200 sm:pt-5">
            <label htmlFor="industry" className="block text-sm font-medium text-gray-700 sm:mt-px sm:pt-2"> Industry (Up to 3) *</label>
            <div className="mt-1 sm:mt-0 sm:col-span-2">
              <Controller
                name="industry"
                control={form.control}
                render={({ field }) => (
                  <Select
                    {...field}
                    instanceId="industry-select"
                    isMulti
                    options={industryOptions}
                    className="max-w-lg block w-full sm:text-sm"
                    styles={selectStyles}
                    value={industryOptions.filter(option => field.value?.includes(option.value))}
                    onChange={(selectedOptions: MultiValue<{ value: string; label: string; }>) => 
                      field.onChange(selectedOptions ? selectedOptions.map(option => option.value) : [])
                    }
                  />
                )}
              />
              {form.formState.errors.industry && <p className="mt-1 text-sm text-red-500">{form.formState.errors.industry.message || (form.formState.errors.industry as any).root?.message}</p>}
              <p className="mt-1 text-xs text-gray-500">Select up to 3 industries.</p>
            </div>
          </div>

          <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start sm:border-t sm:border-gray-200 sm:pt-5">
            <label htmlFor="services" className="block text-sm font-medium text-gray-700 sm:mt-px sm:pt-2"> Services *</label>
            <div className="mt-1 sm:mt-0 sm:col-span-2">
              <Controller
                name="services"
                control={form.control}
                render={({ field }) => (
                  <CreatableSelect
                    {...field}
                    isMulti
                    options={serviceOptions}
                    styles={selectStyles}
                    className="max-w-lg block w-full sm:text-sm"
                    classNamePrefix="select"
                    placeholder="Select or create services..."
                    value={field.value?.map(val => {
                      const predefined = serviceOptions.find(opt => opt.value === val);
                      return predefined ? predefined : { value: val, label: val };
                    }) || []}
                    onChange={(selectedOptions: MultiValue<{ value: string; label: string }>) => 
                      field.onChange(selectedOptions ? selectedOptions.map(option => option.value) : [])
                    }
                    formatCreateLabel={(inputValue) => `Create "${inputValue}"...`}
                    instanceId="services-creatable-select"
                  />
                )}
              />
              {form.formState.errors.services && <p className="mt-1 text-sm text-red-500">{form.formState.errors.services.message}</p>}
            </div>
          </div>

          <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-center sm:border-t sm:border-gray-200 sm:pt-5">
            <label htmlFor="logo" className="block text-sm font-medium text-gray-700"> Company Logo </label>
            <div className="mt-1 sm:mt-0 sm:col-span-2">
              <div className="flex items-center">
                <span className="h-20 w-20 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center">
                  {logoPreview ? (
                    <Image src={logoPreview} alt="Logo Preview" width={80} height={80} className="object-contain" />
                  ) : (
                    <span className="text-xs text-gray-500">No Logo</span>
                  )}
                </span>
                <input type="file" id="logo" onChange={handleFileChange} accept="image/png, image/jpeg, image/gif, image/webp" className="ml-5 bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500" />
              </div>
            </div>
          </div>

        </div>
      </div>

      <hr className="my-8 border-gray-300" />

      <div className="pt-8 space-y-6 sm:pt-10 sm:space-y-5">
        <div>
          <h3 className="text-lg leading-6 font-medium text-gray-900">Company Address</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">Where is the company located? Fields marked with * are required.</p>
        </div>
        <div className="space-y-6 sm:space-y-5">
          <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start sm:border-t sm:border-gray-200 sm:pt-5">
            <label htmlFor="street_address" className="block text-sm font-medium text-gray-700 sm:mt-px sm:pt-2"> Street Address </label>
            <div className="mt-1 sm:mt-0 sm:col-span-2">
              <input type="text" id="street_address" {...form.register('street_address')} className="max-w-lg block w-full shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm border-gray-300 rounded-md" />
            </div>
          </div>

          <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start sm:border-t sm:border-gray-200 sm:pt-5">
            <label htmlFor="province" className="block text-sm font-medium text-gray-700 sm:mt-px sm:pt-2"> Province/Territory *</label>
            <div className="mt-1 sm:mt-0 sm:col-span-2">
              <Controller
                name="province"
                control={form.control}
                render={({ field }) => (
                  <Select
                    {...field}
                    options={Object.entries(canadianProvinces).map(([value, label]) => ({ value, label }))}
                    styles={selectStyles}
                    className="max-w-lg block w-full sm:text-sm"
                    classNamePrefix="select"
                    placeholder="Select province/territory..."
                    isClearable
                    onChange={val => field.onChange(val ? val.value : '')}
                    value={Object.entries(canadianProvinces).map(([v, l]) => ({ value: v, label: l })).find(option => option.value === field.value) || null}
                  />
                )}
              />
               {form.formState.errors.province && <p className="mt-1 text-sm text-red-500">{form.formState.errors.province.message}</p>}
            </div>
          </div>
          
          <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start sm:border-t sm:border-gray-200 sm:pt-5">
            <label htmlFor="major_metropolitan_area" className="block text-sm font-medium text-gray-700 sm:mt-px sm:pt-2"> Major Metropolitan Area *</label>
            <div className="mt-1 sm:mt-0 sm:col-span-2">
              <Controller
                name="major_metropolitan_area"
                control={form.control}
                render={({ field }) => (
                  <Select
                    {...field}
                    options={metroAreaOptions}
                    styles={selectStyles}
                    className="max-w-lg block w-full sm:text-sm"
                    classNamePrefix="select"
                    placeholder="Select metropolitan area..."
                    isClearable
                    isDisabled={!selectedProvince || metroAreaOptions.length === 0}
                    onChange={val => {
                      field.onChange(val ? val.value : '');
                      if (val?.value !== 'OTHER') {
                        form.setValue('other_metropolitan_area_specify', '', { shouldValidate: false });
                      }
                    }}
                    value={metroAreaOptions.find(option => option.value === field.value) || null}
                  />
                )}
              />
              {form.formState.errors.major_metropolitan_area && <p className="mt-1 text-sm text-red-500">{form.formState.errors.major_metropolitan_area.message}</p>}
            </div>
          </div>
          
          {showOtherMetroInput && (
            <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start sm:border-t sm:border-gray-200 sm:pt-5">
              <label htmlFor="other_metropolitan_area_specify" className="block text-sm font-medium text-gray-700 sm:mt-px sm:pt-2"> Specify Metropolitan Area *</label>
              <div className="mt-1 sm:mt-0 sm:col-span-2">
                <input
                  type="text"
                  id="other_metropolitan_area_specify"
                  {...form.register('other_metropolitan_area_specify')}
                  className="max-w-lg block w-full shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm border-gray-300 rounded-md"
                />
                <p className="mt-1 text-xs text-gray-500 text-right">
                  {otherMetroSpecifyValue?.length || 0} / {MAX_OTHER_METRO_LENGTH}
                </p>
                {form.formState.errors.other_metropolitan_area_specify && <p className="mt-1 text-sm text-red-500">{form.formState.errors.other_metropolitan_area_specify.message}</p>}
              </div>
            </div>
          )}

          <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start sm:border-t sm:border-gray-200 sm:pt-5">
            <label htmlFor="city" className="block text-sm font-medium text-gray-700 sm:mt-px sm:pt-2"> City </label>
            <div className="mt-1 sm:mt-0 sm:col-span-2">
              <input type="text" id="city" {...form.register('city')} className="max-w-lg block w-full shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm border-gray-300 rounded-md" />
              {form.formState.errors.city && <p className="mt-1 text-sm text-red-500">{form.formState.errors.city.message}</p>}
            </div>
          </div>

          <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start sm:border-t sm:border-gray-200 sm:pt-5">
            <label htmlFor="postal_code" className="block text-sm font-medium text-gray-700 sm:mt-px sm:pt-2"> Postal Code </label>
            <div className="mt-1 sm:mt-0 sm:col-span-2">
              <Controller
                name="postal_code"
                control={form.control}
                render={({ field }) => (
                  <InputMask
                    {...field}
                    mask="a9a 9a9"
                    maskChar={null}
                    placeholder="A1A 1A1"
                    id="postal_code"
                    className="max-w-xs block w-full shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm border-gray-300 rounded-md"
                    onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
                      field.onBlur();
                      const value = e.target.value.toUpperCase();
                      if (companySchema._def.schema.shape.postal_code.safeParse(value).success) {
                        form.setValue('postal_code', value, { shouldValidate: true, shouldDirty: true });
                      }
                    }}
                  />
                )}
              />
              {form.formState.errors.postal_code && <p className="mt-1 text-sm text-red-500">{form.formState.errors.postal_code.message}</p>}
            </div>
          </div>
          
        </div>
      </div>

      <hr className="my-8 border-gray-300" />

      <div className="pt-8 space-y-6 sm:pt-10 sm:space-y-5">
        <div>
          <h3 className="text-lg leading-6 font-medium text-gray-900">Contact Person</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">Who should be contacted for inquiries? Name and at least one contact method (Email or Phone) are required.</p>
        </div>
        <div className="space-y-6 sm:space-y-5">
          <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start sm:border-t sm:border-gray-200 sm:pt-5">
            <label htmlFor="contact_person_name" className="block text-sm font-medium text-gray-700 sm:mt-px sm:pt-2"> Name *</label>
            <div className="mt-1 sm:mt-0 sm:col-span-2">
              <input type="text" id="contact_person_name" {...form.register('contact_person_name')} className="max-w-lg block w-full shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm border-gray-300 rounded-md" />
            </div>
          </div>

          <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start sm:border-t sm:border-gray-200 sm:pt-5">
            <label htmlFor="contact_person_email" className="block text-sm font-medium text-gray-700 sm:mt-px sm:pt-2"> Email </label>
            <div className="mt-1 sm:mt-0 sm:col-span-2">
              <input type="email" id="contact_person_email" {...form.register('contact_person_email')} className="max-w-lg block w-full shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm border-gray-300 rounded-md" />
              {form.formState.errors.contact_person_email && <p className="mt-1 text-sm text-red-500">{form.formState.errors.contact_person_email.message}</p>}
            </div>
          </div>

          <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start sm:border-t sm:border-gray-200 sm:pt-5">
            <label htmlFor="contact_person_phone" className="block text-sm font-medium text-gray-700 sm:mt-px sm:pt-2"> Phone </label>
            <div className="mt-1 sm:mt-0 sm:col-span-2">
              <Controller
                name="contact_person_phone"
                control={form.control}
                render={({ field }) => (
                  <InputMask
                    {...field}
                    mask="(999) 999-9999"
                    maskChar={null}
                    id="contact_person_phone"
                    placeholder="(123) 456-7890"
                    className="max-w-lg block w-full shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm border-gray-300 rounded-md"
                  />
                )}
              />
              {form.formState.errors.contact_person_phone && <p className="mt-1 text-sm text-red-500">{form.formState.errors.contact_person_phone.message}</p>}
              {form.formState.errors.contact_person_email?.type === 'custom' && 
               form.formState.errors.contact_person_email?.message?.includes('At least one contact method') && 
               !form.formState.errors.contact_person_phone && (
                <p className="mt-1 text-sm text-red-500">{form.formState.errors.contact_person_email.message}</p>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <hr className="my-8 border-gray-300" />

      {/* Tier 1 Verification Section */}
      <div className="pt-8 space-y-6 sm:pt-10 sm:space-y-5">
        <div>
          <h3 className="text-lg leading-6 font-medium text-gray-900">Business Verification (Tier 1)</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">Complete this section to apply for Tier 1 Verification. Admins will review your submission.</p>
        </div>
        <div className="space-y-6 sm:space-y-5">
          {/* Business Number */}
          <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start sm:border-t sm:border-gray-200 sm:pt-5">
            <label htmlFor="business_number" className="block text-sm font-medium text-gray-700 sm:mt-px sm:pt-2"> Corporate / Business Number </label>
            <div className="mt-1 sm:mt-0 sm:col-span-2">
              <input type="text" id="business_number" {...form.register('business_number')} className="max-w-lg block w-full shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm border-gray-300 rounded-md" />
              {form.formState.errors.business_number && <p className="mt-1 text-sm text-red-500">{form.formState.errors.business_number.message}</p>}
              <p className="mt-1 text-xs text-gray-500">Enter your Federal Corporation Number or Provincial Business Number (BN).</p>
            </div>
          </div>

          {/* Public Presence Links */}
          <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start sm:border-t sm:border-gray-200 sm:pt-5">
            <label htmlFor="public_presence_links" className="block text-sm font-medium text-gray-700 sm:mt-px sm:pt-2"> Public Presence Links (Optional) </label>
            <div className="mt-1 sm:mt-0 sm:col-span-2">
              <Controller
                name="public_presence_links"
                control={form.control}
                render={({ field }) => (
                  <CreatableSelect
                    {...field}
                    isMulti
                    options={[]}
                    styles={selectStyles} // Assuming selectStyles is defined elsewhere and appropriate
                    className="max-w-lg block w-full sm:text-sm"
                    classNamePrefix="select"
                    placeholder="Enter links (e.g., LinkedIn, Website)..."
                    value={field.value?.map(val => ({ value: val, label: val })) || []}
                    onChange={(selectedOptions: MultiValue<{ value: string; label: string }>) => 
                      field.onChange(selectedOptions ? selectedOptions.map(option => option.value) : [])
                    }
                    formatCreateLabel={(inputValue) => `Add link: "${inputValue}"...`}
                    instanceId="public-presence-links-select"
                  />
                )}
              />
              {form.formState.errors.public_presence_links && <p className="mt-1 text-sm text-red-500">{form.formState.errors.public_presence_links.message}</p>}
              <p className="mt-1 text-xs text-gray-500">Provide links to your company website, LinkedIn profile, or other public business pages.</p>
            </div>
          </div>

          {/* Self-Attestation Clause */}
          <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start sm:border-t sm:border-gray-200 sm:pt-5">
            <label htmlFor="self_attestation_completed" className="block text-sm font-medium text-gray-700 sm:mt-px sm:pt-2"> Self-Attestation *</label>
            <div className="mt-1 sm:mt-0 sm:col-span-2">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input 
                    id="self_attestation_completed" 
                    type="checkbox" 
                    {...form.register('self_attestation_completed')} 
                    className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="self_attestation_completed" className="font-medium text-gray-700">I certify I am authorized to represent this business and all submitted information is true.</label>
                </div>
              </div>
              {form.formState.errors.self_attestation_completed && <p className="mt-1 text-sm text-red-500">{form.formState.errors.self_attestation_completed.message}</p>}
            </div>
          </div>

        </div>
      </div>

      <hr className="my-8 border-gray-300" />

      <div className="pt-5">
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isLoading || form.formState.isSubmitting}
            className="w-full md:w-auto flex justify-center py-2 px-6 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
          >
            {isLoading || form.formState.isSubmitting ? 'Saving...' : 'Save Company'}
          </button>
        </div>
      </div>
    </form>
  )
} 