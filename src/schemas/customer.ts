import { z } from "zod";

export const customerSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi").max(100),
  contact: z.string().max(100).optional().or(z.literal("")),
  favoriteDrink: z.string().min(1, "Minuman favorit wajib diisi").max(200),
  interestTags: z
    .array(z.string().min(1).max(50))
    .min(1, "Pilih minimal 1 tag")
    .max(10),
});

export type CustomerFormValues = z.infer<typeof customerSchema>;
