<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreMissionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:100'],
            'vehicle_id' => ['nullable', 'string', 'exists:vehicles,id'],
            'schedule' => ['nullable', 'date'],
            'priority' => ['nullable', 'string', 'in:low,normal,high,urgent'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.waypoint_id' => ['required', 'integer', 'exists:waypoints,id'],
            'items.*.order_index' => ['nullable', 'integer'],
            'items.*.schedule' => ['nullable', 'date'],
        ];
    }
}
