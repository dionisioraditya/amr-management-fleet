<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreVehicleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'id' => ['required', 'string', 'max:50', 'unique:vehicles,id'],
            'name' => ['required', 'string', 'max:100'],
            'ip_address' => ['required', 'ip', 'unique:vehicles,ip_address'],
            'password' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', 'string', 'in:idle,active,moving,charging,maintenance,error,offline,emergency_stop'],
            'battery_percentage' => ['nullable', 'integer', 'between:0,100'],
        ];
    }
}
