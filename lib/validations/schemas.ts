import { z } from 'zod'

// Login Schema
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

// Change Password Schema
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })

// FIR Schema
export const firSchema = z.object({
  fir_number: z.string().min(1, 'FIR number is required').max(50, 'FIR number too long'),
  police_station_id: z.number().positive('Police station is required'),
  railway_district_id: z.number().positive('Railway district is required'),
  incident_date: z.date({
    required_error: 'Incident date is required',
  }).refine((date) => date <= new Date(), {
    message: 'Incident date cannot be in the future',
  }),
  incident_time: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  train_id: z.number().optional(),
  train_number_manual: z.string().optional(),
  train_name_manual: z.string().optional(),
  station_id: z.number().optional(),
  station_name_manual: z.string().optional(),
  modus_operandi_id: z.number().positive('Modus operandi is required'),
  brief_description: z
    .string()
    .min(50, 'Brief description must be at least 50 characters')
    .max(500, 'Brief description must not exceed 500 characters'),
  detailed_description: z.string().max(2000, 'Detailed description must not exceed 2000 characters').optional(),
  law_sections: z.array(z.number()).min(1, 'At least one law section is required'),
  law_sections_text: z.string().optional(),
  property_stolen: z.string().optional(),
  estimated_value: z.number().min(0).optional(),
})

// Accused Schema
export const accusedSchema = z.object({
  fir_id: z.number().positive('FIR is required'),
  full_name: z.string().min(3, 'Full name must be at least 3 characters').max(200, 'Name too long'),
  alias_name: z.string().max(200).optional(),
  gender: z.enum(['Male', 'Female', 'Other'], {
    required_error: 'Gender is required',
  }),
  age: z.number().min(1, 'Age must be at least 1').max(120, 'Age must not exceed 120'),
  date_of_birth: z.date().optional(),
  mobile_number: z.string().regex(/^[0-9]{10}$/, 'Mobile number must be 10 digits').optional().or(z.literal('')),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  father_name: z.string().max(200).optional(),
  mother_name: z.string().max(200).optional(),
  parentage: z.string().optional(),
  current_address: z.string().min(10, 'Current address is required'),
  permanent_address: z.string().optional(),
  police_station_id: z.number().optional(),
  district_id: z.number().optional(),
  state_id: z.number().optional(),
  pincode: z.string().regex(/^[0-9]{6}$/, 'Pincode must be 6 digits').optional().or(z.literal('')),
  aadhar_number: z.string().regex(/^[0-9]{12}$/, 'Aadhar must be 12 digits').optional().or(z.literal('')),
  pan_number: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'PAN must be in format ABCDE1234F').optional().or(z.literal('')),
  photo_url: z.string().optional(),
  identification_marks: z.string().optional(),
  previous_cases: z.number().min(0).default(0),
  previous_convictions: z.number().min(0).default(0),
  is_habitual_offender: z.boolean().default(false),
})

// Bail Schema
export const bailSchema = z
  .object({
    accused_id: z.number().positive('Accused is required'),
    fir_id: z.number().positive('FIR is required'),
    custody_status: z.enum(['bail', 'custody', 'absconding'], {
      required_error: 'Custody status is required',
    }),
    court_id: z.number().optional(),
    court_name_manual: z.string().optional(),
    bail_order_number: z.string().optional(),
    bail_date: z.date().optional(),
    bail_amount: z.number().min(0).optional(),
    bailer_name: z.string().optional(),
    bailer_relation: z.string().optional(),
    bailer_parentage: z.string().optional(),
    bailer_address: z.string().optional(),
    bailer_state: z.string().optional(),
    bailer_district: z.string().optional(),
    bailer_gender: z.string().optional(),
    bailer_age: z.number().optional(),
    bailer_mobile: z.string().optional(),
    bail_conditions: z.string().optional(),
    next_hearing_date: z.date().optional(),
    custody_location: z.string().optional(),
    custody_from_date: z.date().optional(),
  })
  .refine(
    (data) => {
      if (data.custody_status === 'bail') {
        return data.court_id || data.court_name_manual
      }
      return true
    },
    {
      message: 'Court name is required for bail',
      path: ['court_name_manual'],
    }
  )
  .refine(
    (data) => {
      if (data.custody_status === 'bail') {
        return data.bail_order_number && data.bail_order_number.length > 0
      }
      return true
    },
    {
      message: 'Bail order number is required',
      path: ['bail_order_number'],
    }
  )
  .refine(
    (data) => {
      if (data.custody_status === 'bail') {
        return data.bail_date
      }
      return true
    },
    {
      message: 'Bail date is required',
      path: ['bail_date'],
    }
  )
  .refine(
    (data) => {
      if (data.custody_status === 'bail') {
        return (
          data.bailer_name &&
          data.bailer_relation &&
          data.bailer_address &&
          data.bailer_state &&
          data.bailer_district &&
          data.bailer_gender &&
          data.bailer_age &&
          data.bailer_age >= 21
        )
      }
      return true
    },
    {
      message: 'All bailer details are required and bailer must be at least 21 years old',
      path: ['bailer_age'],
    }
  )
  .refine(
    (data) => {
      if (data.custody_status === 'custody') {
        return data.custody_location && data.custody_location.trim().length > 0
      }
      return true
    },
    {
      message: 'Custody location is required',
      path: ['custody_location'],
    }
  )
  .refine(
    (data) => {
      if (data.custody_status === 'custody') {
        return data.custody_from_date
      }
      return true
    },
    {
      message: 'From date is required',
      path: ['custody_from_date'],
    }
  )

// Profile Schema
export const profileSchema = z.object({
  full_name: z.string().min(3, 'Name must be at least 3 characters').max(100, 'Name too long'),
  mobile: z.string().regex(/^[0-9]{10}$/, 'Mobile number must be 10 digits'),
})

export type LoginInput = z.infer<typeof loginSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
export type FIRInput = z.infer<typeof firSchema>
export type AccusedInput = z.infer<typeof accusedSchema>
export type BailInput = z.infer<typeof bailSchema>
export type ProfileInput = z.infer<typeof profileSchema>


