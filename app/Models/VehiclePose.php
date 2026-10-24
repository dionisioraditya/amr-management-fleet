<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VehiclePose extends Model
{
    use HasFactory;

    protected $fillable = [
        'vehicle_id',
        'x',
        'y',
        'theta',
    ];

    protected function casts(): array
    {
        return [
            'x' => 'float',
            'y' => 'float',
            'theta' => 'float',
        ];
    }

    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class, 'vehicle_id', 'id');
    }
}
