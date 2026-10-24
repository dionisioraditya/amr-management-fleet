<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePathplanRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:100'],
            'is_bidirectional' => ['nullable', 'boolean'],
            'max_speed' => ['nullable', 'numeric', 'min:0.1', 'max:5.0'],
            'coordinates' => ['required', 'array', 'min:2'],
            'coordinates.*.x' => ['required', 'numeric'],
            'coordinates.*.y' => ['required', 'numeric'],
            'description' => ['nullable', 'string', 'max:500'],
        ];
    }
}
