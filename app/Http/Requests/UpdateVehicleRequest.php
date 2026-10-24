<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateVehicleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $vehicle = $this->route('vehicle');
        $vehicleId = is_object($vehicle) ? $vehicle->id : $vehicle;

        return [
            'name' => ['sometimes', 'required', 'string', 'max:100'],
            'ip_address' => ['sometimes', 'required', 'ip', Rule::unique('vehicles', 'ip_address')->ignore($vehicleId, 'id')],
            'password' => ['nullable', 'string', 'max:255'],
            'status' => ['sometimes', 'string', 'in:idle,active,moving,charging,maintenance,error,offline,emergency_stop'],
            'battery_percentage' => ['sometimes', 'integer', 'between:0,100'],
        ];
    }
}
