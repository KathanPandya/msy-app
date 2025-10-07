export namespace Address {
	export type Update = {
		address_line_1: string;
		address_line_2: string;
		area_name: string;
		landmark: string;
		city: string;
		country: string;
		state: string;
		pincode: string;
		is_nominee_address: boolean;
	};

	export type Data = {
		address_line_1: string;
		address_line_2: string;
		area_name: string;
		city: string;
		country: string;
		createdAt: string;
		is_nominee_address: boolean;
		landmark: string;
		pincode: string;
		state: string;
		updatedAt: string;
		userId: string;
		__v: number;
		_id: string;
	};

	export type Get = Data[];

	export type Create = {
		address_line_1: string;
		address_line_2: string;
		area_name: string;
		landmark: string;
		city: string;
		pincode: string;
		state: string;
		country: string;
		is_nominee_address: boolean;
	};
}
