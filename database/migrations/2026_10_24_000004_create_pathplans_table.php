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
        Schema::create('pathplans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('map_id')->constrained('maps')->cascadeOnDelete();
            $table->string('name');
            $table->boolean('is_bidirectional')->default(true);
            $table->decimal('max_speed', 5, 2)->default(1.00); // m/s
            $table->json('coordinates'); // Array of point/coordinate objects
            $table->text('description')->nullable();
            $table->timestamps();

            $table->index(['map_id', 'name']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pathplans');
    }
};
