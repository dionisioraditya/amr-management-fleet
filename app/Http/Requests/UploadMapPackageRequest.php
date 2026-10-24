<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UploadMapPackageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['nullable', 'string', 'max:100'],
            'package' => ['required', 'file', 'mimes:zip', 'max:102400'], // up to 100 MB .zip
        ];
    }
}
