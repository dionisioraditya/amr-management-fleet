<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreWaypointRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:50'],
            'x' => ['required', 'numeric'],
            'y' => ['required', 'numeric'],
            'theta' => ['nullable', 'numeric'],
        ];
    }
}
