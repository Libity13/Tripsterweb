import { z } from "zod";

export const DestinationSchema = z.object({
  name: z.string().describe('ชื่อสถานที่'),
  name_en: z.string().optional().describe('ชื่อภาษาอังกฤษ'),
  description: z.string().optional().describe('คำอธิบายสถานที่'),
  latitude: z.number().optional().describe('ละติจูด'),
  longitude: z.number().optional().describe('ลองจิจูด'),
  rating: z.number().min(0).max(5).optional().describe('คะแนน 0-5'),
  visit_duration: z.number().min(15).max(480).optional().describe('เวลาที่ใช้ (นาที)'),
  estimated_cost: z.number().min(0).optional().describe('ค่าใช้จ่ายโดยประมาณ (บาท)'),
  place_types: z.array(z.string()).optional().describe('ประเภทสถานที่'),
  place_type: z.enum(['tourist_attraction', 'lodging', 'restaurant']).optional().describe('ประเภทสถานที่หลัก'),
  priority: z.enum(['high', 'medium', 'low']).optional().describe('ความสำคัญ'),
  hint_address: z.string().optional().describe('คำใบ้ที่อยู่')
});

// Individual Action Schemas
export const AddDestinationsSchema = z.object({
  action: z.literal("ADD_DESTINATIONS"),
  location_context: z.string().optional().describe('บริบทสถานที่ (จังหวัด/เมือง)'),
  day: z.number().int().min(1).optional().describe('วันที่ในทริป (1-based)'),
  destinations: z.array(z.object({
    name: z.string().min(1).describe('ชื่อสถานที่'),
    hintAddress: z.string().optional().describe('คำใบ้ที่อยู่'),
    minHours: z.number().optional().describe('เวลาขั้นต่ำ (ชั่วโมง)'),
    place_type: z.enum(["tourist_attraction","lodging","restaurant"]).optional().describe('ประเภทสถานที่')
  })).min(1).describe('รายการสถานที่ที่ต้องการเพิ่ม')
});

export const RemoveDestinationsSchema = z.object({
  action: z.literal("REMOVE_DESTINATIONS"),
  destination_names: z.array(z.string().min(1)).min(1).optional().describe('ชื่อสถานที่ที่ต้องการลบ')
});

export const ReorderDestinationsSchema = z.object({
  action: z.literal("REORDER_DESTINATIONS"),
  destination_order: z.array(z.object({
    name: z.string().min(1).describe('ชื่อสถานที่'),
    day: z.number().int().min(1).describe('วันที่'),
    order_index: z.number().int().min(1).describe('ลำดับในวัน')
  })).min(1).describe('ลำดับใหม่ของสถานที่')
});

export const MoveDestinationSchema = z.object({
  action: z.literal("MOVE_DESTINATION"),
  destination_name: z.string().min(1).describe('ชื่อสถานที่ที่ต้องการย้าย'),
  target_day: z.number().int().min(1).describe('วันที่ต้องการย้ายไป'),
  target_position: z.number().int().min(1).optional().describe('ตำแหน่งที่ต้องการ (optional, จะเติมท้ายถ้าไม่ระบุ)')
});

export const UpdateTripInfoSchema = z.object({
  action: z.literal("UPDATE_TRIP_INFO"),
  days: z.number().int().min(1).optional().describe('จำนวนวัน'),
  start_date: z.string().optional().describe('วันที่เริ่มต้น'),
  budget_min: z.number().optional().describe('งบขั้นต่ำ'),
  budget_max: z.number().optional().describe('งบขั้นสูง')
});

export const RecommendPlacesSchema = z.object({
  action: z.literal("RECOMMEND_PLACES"),
  location_context: z.string().min(1).describe('บริบทสถานที่'),
  place_types: z.array(z.enum(["restaurant","lodging","tourist_attraction"])).min(1).describe('ประเภทสถานที่'),
  recommendations: z.array(z.object({
    name: z.string().min(1).describe('ชื่อสถานที่'),
    type: z.enum(["restaurant","lodging","tourist_attraction"]).describe('ประเภท'),
    description: z.string().optional().describe('คำอธิบาย')
  })).optional().describe('รายการแนะนำ')
});

export const AskPersonalInfoSchema = z.object({
  action: z.literal("ASK_PERSONAL_INFO"),
  personal_info: z.object({
    travel_companions: z.string().optional().describe('เพื่อนร่วมเดินทาง'),
    budget_range: z.string().optional().describe('ช่วงงบประมาณ'),
    travel_style: z.string().optional().describe('สไตล์การเดินทาง')
  }).partial().optional().describe('ข้อมูลส่วนตัวที่ต้องการ')
});

export const NoActionSchema = z.object({
  action: z.literal("NO_ACTION")
});

export const ModifyTripSchema = z.object({
  action: z.literal("MODIFY_TRIP"),
  trip_modification: z.object({
    new_total_days: z.number().int().min(1).describe('จำนวนวันใหม่ของทริป'),
    extend_to_province: z.string().optional().describe('จังหวัดที่ต้องการขยายทริปไป'),
    modification_type: z.enum(["ADD_DAYS", "REMOVE_DAYS", "CHANGE_DATES"]).optional().describe('ประเภทการแก้ไข')
  }).describe('ข้อมูลการแก้ไขทริป')
});

// Main discriminated union
export const TripActionSchema = z.discriminatedUnion("action", [
  AddDestinationsSchema,
  RemoveDestinationsSchema,
  ReorderDestinationsSchema,
  MoveDestinationSchema,
  UpdateTripInfoSchema,
  ModifyTripSchema,
  RecommendPlacesSchema,
  AskPersonalInfoSchema,
  NoActionSchema
]);

export const TripActionsSchema = z.object({
  reply: z.string().describe('ข้อความตอบกลับ'),
  actions: z.array(TripActionSchema).default([]).describe('รายการการกระทำ'),
  suggest_login: z.boolean().optional().describe('แนะนำให้เข้าสู่ระบบ')
});

// Type exports
export type TripAction = z.infer<typeof TripActionSchema>;
export type TripActions = z.infer<typeof TripActionsSchema>;
export type Destination = z.infer<typeof DestinationSchema>;
export type AddDestinations = z.infer<typeof AddDestinationsSchema>;
export type RemoveDestinations = z.infer<typeof RemoveDestinationsSchema>;
export type ReorderDestinations = z.infer<typeof ReorderDestinationsSchema>;
export type MoveDestination = z.infer<typeof MoveDestinationSchema>;
export type UpdateTripInfo = z.infer<typeof UpdateTripInfoSchema>;
export type RecommendPlaces = z.infer<typeof RecommendPlacesSchema>;
export type AskPersonalInfo = z.infer<typeof AskPersonalInfoSchema>;
export type NoAction = z.infer<typeof NoActionSchema>;
export type ModifyTrip = z.infer<typeof ModifyTripSchema>;