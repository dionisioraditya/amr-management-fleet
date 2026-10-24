<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Vehicle extends Model
{
    use HasFactory;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'name',
        'ip_address',
        'password',
        'status',
        'battery_percentage',
    ];

    protected $hidden = [
        'password',
    ];

    protected function casts(): array
    {
        return [
            'battery_percentage' => 'integer',
        ];
    }

    public function pose(): HasOne
    {
        return $this->hasOne(VehiclePose::class, 'vehicle_id', 'id');
    }

    public function missions(): HasMany
    {
        return $this->hasMany(Mission::class, 'vehicle_id', 'id');
    }

    public function logs(): HasMany
    {
        return $this->hasMany(VehicleLog::class, 'vehicle_id', 'id');
    }
}
