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
        Schema::create('vehicle_poses', function (Blueprint $table) {
            $table->id();
            $table->string('vehicle_id')->unique();
            $table->foreign('vehicle_id')->references('id')->on('vehicles')->cascadeOnDelete();
            $table->decimal('x', 10, 4)->default(0.0000);
            $table->decimal('y', 10, 4)->default(0.0000);
            $table->decimal('theta', 10, 4)->default(0.0000);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('vehicle_poses');
    }
};
