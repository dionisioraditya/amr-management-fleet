<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreMapRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required_without:package', 'nullable', 'string', 'max:100'],
            'package' => ['nullable', 'file', 'mimes:zip', 'max:102400'],
            'image' => ['nullable', 'file', 'image', 'max:10240'], // optional image file upload up to 10MB
            'image_path' => ['required_without_all:image,package', 'nullable', 'string', 'max:255'],
            'resolution' => ['nullable', 'numeric', 'min:0.001'],
            'origin_x' => ['nullable', 'numeric'],
            'origin_y' => ['nullable', 'numeric'],
            'origin_yaw' => ['nullable', 'numeric'],
        ];
    }
}
