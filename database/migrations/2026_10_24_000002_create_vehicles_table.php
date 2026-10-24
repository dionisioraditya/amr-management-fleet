<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('vehicles', function (Blueprint $table) {
            $table->string('id')->primary(); // e.g. 'AMR-01', 'AMR-02'
            $table->string('name');
            $table->string('ip_address')->unique();
            $table->string('password')->nullable();
            $table->string('status')->default('idle')->index(); // 'idle', 'moving', 'charging', 'error', 'offline', 'emergency_stop'
            $table->unsignedTinyInteger('battery_percentage')->default(100);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('vehicles');
    }
};
