<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateTelemetryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'x' => ['required', 'numeric'],
            'y' => ['required', 'numeric'],
            'theta' => ['required', 'numeric'],
            'status' => ['nullable', 'string', 'in:idle,active,moving,charging,maintenance,error,offline,emergency_stop'],
            'battery_percentage' => ['nullable', 'integer', 'between:0,100'],
            'event' => ['nullable', 'string', 'max:255'],
        ];
    }
}
