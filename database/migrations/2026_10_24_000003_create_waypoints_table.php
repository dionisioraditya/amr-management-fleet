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
        Schema::create('waypoints', function (Blueprint $table) {
            $table->id();
            $table->foreignId('map_id')->constrained('maps')->cascadeOnDelete();
            $table->string('name');
            $table->decimal('x', 10, 4);
            $table->decimal('y', 10, 4);
            $table->decimal('theta', 10, 4)->default(0.0000); // Radians orientation
            $table->timestamps();

            $table->index(['map_id', 'name']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('waypoints');
    }
};
