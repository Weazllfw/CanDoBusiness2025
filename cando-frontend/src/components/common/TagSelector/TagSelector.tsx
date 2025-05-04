import { Fragment, useState } from 'react'
import { Combobox, Transition } from '@headlessui/react'
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/20/solid'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'

export type TagCategory = 'industry' | 'capability' | 'region'

interface TagSelectorProps {
  category: TagCategory
  selectedTags: string[]
  onChange: (tags: string[]) => void
  maxTags?: number
  className?: string
}

// Tag data
const tagData = {
  industry: [
    "Food & Beverage",
    "Agriculture",
    "Apparel & Textiles",
    "Automotive",
    "Aerospace & Aviation",
    "Construction",
    "Consumer Goods",
    "Cosmetics & Personal Care",
    "Electronics & Hardware",
    "Energy & Utilities",
    "Environmental Services",
    "Finance & Accounting",
    "Healthcare & Medical Devices",
    "Home Goods & Furniture",
    "Industrial Equipment",
    "Information Technology",
    "Legal & Compliance",
    "Logistics & Distribution",
    "Machining & Metalworking",
    "Media & Publishing",
    "Mining & Natural Resources",
    "Non-Profit / Community Services",
    "Packaging & Printing",
    "Paper & Pulp",
    "Pharmaceuticals",
    "Professional Services",
    "Renewable Energy",
    "Retail",
    "Software & SaaS",
    "Telecommunications",
    "Transportation",
    "Waste Management",
    "Wood & Forestry"
  ],
  capability: [
    "Assembly & Kitting",
    "3D Printing",
    "CAD Design",
    "Cold Storage",
    "Co-Packing",
    "Custom Fabrication",
    "Die Cutting",
    "Digital Printing",
    "Drop Shipping",
    "E-commerce Fulfillment",
    "Electrical Assembly",
    "Food Packaging",
    "Formulating / Mixing",
    "Injection Molding",
    "Label Printing",
    "Last-Mile Delivery",
    "Legal Advisory",
    "Logistics Coordination",
    "Machining (CNC, Laser, Plasma)",
    "Metal Bending / Forming",
    "Milling",
    "Packaging Design",
    "Palletizing",
    "Plastics Manufacturing",
    "Powder Coating",
    "Product Photography",
    "Product Sourcing",
    "Quality Control & Testing",
    "Regulatory Compliance Consulting",
    "Retail Distribution",
    "Screen Printing",
    "Sheet Metal Fabrication",
    "Shrink Wrapping",
    "Software Development",
    "Sustainability Consulting",
    "Tooling & Prototyping",
    "Warehousing",
    "Welding",
    "Wholesale Distribution",
    "Woodworking",
    "Workforce Training"
  ],
  region: [
    "Alberta",
    "British Columbia",
    "Manitoba",
    "New Brunswick",
    "Newfoundland and Labrador",
    "Northwest Territories",
    "Nova Scotia",
    "Nunavut",
    "Ontario",
    "Prince Edward Island",
    "Quebec",
    "Saskatchewan",
    "Yukon",
    "Calgary",
    "Edmonton",
    "Vancouver",
    "Victoria",
    "Winnipeg",
    "Fredericton",
    "St. John's",
    "Yellowknife",
    "Halifax",
    "Iqaluit",
    "Toronto",
    "Ottawa",
    "Hamilton",
    "Kitchener-Waterloo",
    "London (ON)",
    "Montreal",
    "Quebec City",
    "Saskatoon",
    "Regina",
    "Charlottetown",
    "Whitehorse"
  ]
}

export function TagSelector({ category, selectedTags, onChange, maxTags = 5, className }: TagSelectorProps) {
  const [query, setQuery] = useState('')
  
  const filteredTags = query === ''
    ? tagData[category]
    : tagData[category].filter((tag) =>
        tag.toLowerCase().includes(query.toLowerCase())
      )

  const handleSelect = (tag: string) => {
    if (!selectedTags.includes(tag) && selectedTags.length < maxTags) {
      onChange([...selectedTags, tag])
    }
  }

  const handleRemove = (tagToRemove: string) => {
    onChange(selectedTags.filter(tag => tag !== tagToRemove))
  }

  return (
    <div className={cn("space-y-2", className)}>
      <Combobox value={null} onChange={handleSelect}>
        <div className="relative">
          <div className="relative w-full cursor-default overflow-hidden rounded-lg bg-white text-left border border-gray-300 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
            <Combobox.Input
              className="w-full border-none py-2 pl-3 pr-10 text-sm leading-5 text-gray-900 focus:ring-0"
              placeholder={`Search ${category} tags...`}
              onChange={(event) => setQuery(event.target.value)}
            />
            <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronUpDownIcon
                className="h-5 w-5 text-gray-400"
                aria-hidden="true"
              />
            </Combobox.Button>
          </div>
          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
            afterLeave={() => setQuery('')}
          >
            <Combobox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
              {filteredTags.length === 0 && query !== '' ? (
                <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
                  Nothing found.
                </div>
              ) : (
                filteredTags.map((tag) => (
                  <Combobox.Option
                    key={tag}
                    className={({ active }) =>
                      cn(
                        'relative cursor-default select-none py-2 pl-10 pr-4',
                        active ? 'bg-blue-600 text-white' : 'text-gray-900'
                      )
                    }
                    value={tag}
                    disabled={selectedTags.includes(tag)}
                  >
                    {({ selected, active }) => (
                      <>
                        <span
                          className={cn(
                            'block truncate',
                            selectedTags.includes(tag) ? 'font-medium text-gray-400' : 'font-normal'
                          )}
                        >
                          {tag}
                        </span>
                        {selectedTags.includes(tag) ? (
                          <span
                            className={cn(
                              'absolute inset-y-0 left-0 flex items-center pl-3',
                              active ? 'text-white' : 'text-blue-600'
                            )}
                          >
                            <CheckIcon className="h-5 w-5" aria-hidden="true" />
                          </span>
                        ) : null}
                      </>
                    )}
                  </Combobox.Option>
                ))
              )}
            </Combobox.Options>
          </Transition>
        </div>
      </Combobox>

      {/* Selected tags */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-x-0.5 rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10"
            >
              {tag}
              <button
                type="button"
                onClick={() => handleRemove(tag)}
                className="group relative -mr-1 h-3.5 w-3.5 rounded-sm hover:bg-blue-600/20"
              >
                <span className="sr-only">Remove</span>
                <XMarkIcon className="h-3.5 w-3.5 text-blue-700 group-hover:text-blue-900" aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
} 