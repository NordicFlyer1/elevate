import { GearModel } from "./gear.model";
import { GearType } from "./gear-type.enum";

export class ShoesGearModel extends GearModel {
  public brand_name: string;
  public model_name: string;
  public name: string;
  public notification_distance: number;

  constructor(
    id: number,
    total_distance: number,
    isActive: boolean,
    isDefault: boolean,
    description: string,
    display_name: string,
    brand_name: string,
    model_name: string,
    name: string,
    notification_distance: number,
    units: string
  ) {
    super(id, total_distance, isActive, isDefault, description, display_name, units);
    this.brand_name = brand_name;
    this.model_name = model_name;
    this.name = name;
    this.notification_distance = notification_distance;
    this.type = GearType.SHOES;
  }
}
