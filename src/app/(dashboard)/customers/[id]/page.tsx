import { CustomerForm } from "@/components/customers/customer-form";
import { getCustomerById } from "@/actions/customer-actions";
import { notFound } from "next/navigation";

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = await getCustomerById(id);
  if (!customer) notFound();

  return (
    <CustomerForm
      customerId={customer.id}
      defaultValues={{
        name: customer.name,
        contact: customer.contact ?? "",
        favoriteDrink: customer.favoriteDrink,
        interestTags: customer.interestTags,
      }}
    />
  );
}
