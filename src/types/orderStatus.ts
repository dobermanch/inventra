import type { TranslationKey } from "../translations";

export enum OrderStatus {
  Active = "active",
  Shipped = "shipped",
  Delivered = "delivered",
  Canceled = "canceled",
  Returned = "returned",
}

export const ORDER_STATUSES = [
  OrderStatus.Active,
  OrderStatus.Shipped,
  OrderStatus.Delivered,
  OrderStatus.Canceled,
  OrderStatus.Returned,
] as const;

export const STATUS_TRANSLATION_KEY: Record<OrderStatus, TranslationKey> = {
  [OrderStatus.Active]: "statusActive",
  [OrderStatus.Shipped]: "statusShipped",
  [OrderStatus.Delivered]: "statusDelivered",
  [OrderStatus.Canceled]: "statusCanceled",
  [OrderStatus.Returned]: "statusReturned",
};

export const getStatusColor = (status: string) => {
  switch (status) {
    case OrderStatus.Active:
      return "primary";
    case OrderStatus.Shipped:
      return "info";
    case OrderStatus.Delivered:
      return "success";
    case OrderStatus.Canceled:
      return "error";
    case OrderStatus.Returned:
      return "warning";
    default:
      return "default";
  }
};
